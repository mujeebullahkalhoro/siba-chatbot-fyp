# rag/graph/timetable_lookup.py
"""
Parses aSc Timetable XML export and provides fast in-memory lookup
for timetable queries (by class/section, teacher, room, subject, day).

Key design decisions:
- Direct candidate scoring against known names (no fragile regex for names)
- Section-aware matching: "BS CS VIII D" → BS-VIII(CS)-D
- Ambiguous teacher names produce a clarification response
"""

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Optional

# ── Day bitmask mapping ──────────────────────────────────
DAY_BITS   = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday"}
DAY_ORDER  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# Roman numeral → integer
_ROMAN = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10}

def _roman_to_int(s: str) -> int:
    return _ROMAN.get(s.upper(), -1)

def _int_to_roman(n: int) -> str:
    mapping = [(8,"VIII"),(7,"VII"),(6,"VI"),(5,"V"),(4,"IV"),(3,"III"),(2,"II"),(1,"I")]
    for v, r in mapping:
        if n == v:
            return r
    return str(n)


@dataclass
class ScheduleEntry:
    day:        str
    period:     int
    start_time: str
    end_time:   str
    subject:    str
    teacher:    str
    class_name: str
    group:      str
    room:       str


class TimetableLookup:
    """Parses aSc Timetable XML and provides accurate search."""

    def __init__(self, xml_path: str):
        self.entries:       List[ScheduleEntry] = []
        self.all_classes:   List[str]           = []   # all known class names
        self.all_teachers:  List[str]           = []   # all known teacher names
        self._parse(xml_path)
        print(f"[TIMETABLE] Loaded {len(self.entries)} entries, "
              f"{len(self.all_classes)} classes, {len(self.all_teachers)} teachers")

    # ────────────────────────────────────────────────────
    # XML parsing
    # ────────────────────────────────────────────────────
    def _parse(self, xml_path: str):
        tree = ET.parse(xml_path)
        root = tree.getroot()

        teachers    : Dict[str, str] = {}
        subjects    : Dict[str, str] = {}
        classes     : Dict[str, str] = {}
        rooms       : Dict[str, str] = {}
        groups      : Dict[str, Dict] = {}
        period_map  : Dict[str, tuple] = {}

        for el in root.findall(".//teacher"):
            tid  = el.attrib.get("id", "")
            name = el.attrib.get("name", el.attrib.get("short", ""))
            teachers[tid] = name
            if name and name not in self.all_teachers:
                self.all_teachers.append(name)

        for el in root.findall(".//subject"):
            sid  = el.attrib.get("id", "")
            name = el.attrib.get("name", el.attrib.get("short", ""))
            subjects[sid] = name

        for el in root.findall(".//class"):
            cid  = el.attrib.get("id", "")
            name = el.attrib.get("name", el.attrib.get("short", ""))
            classes[cid] = name
            if name and name not in self.all_classes:
                self.all_classes.append(name)

        for el in root.findall(".//classroom"):
            rid  = el.attrib.get("id", "")
            name = el.attrib.get("name", el.attrib.get("short", ""))
            rooms[rid] = name

        for el in root.findall(".//group"):
            gid = el.attrib.get("id", "")
            groups[gid] = {
                "name":        el.attrib.get("name", ""),
                "classid":     el.attrib.get("classid", ""),
                "entireclass": el.attrib.get("entireclass", "0"),
            }

        for el in root.findall(".//period"):
            pname = el.attrib.get("period", el.attrib.get("name", el.attrib.get("short", "")))
            period_map[pname] = (
                el.attrib.get("starttime", ""),
                el.attrib.get("endtime", ""),
            )

        lesson_map: Dict[str, Dict] = {}
        for el in root.findall(".//lesson"):
            lid          = el.attrib.get("id", "")
            teacher_ids  = [t.strip() for t in el.attrib.get("teacherids", "").split(",") if t.strip()]
            teacher_names = [teachers.get(t, t) for t in teacher_ids]

            class_ids    = [c.strip() for c in el.attrib.get("classids", "").split(",") if c.strip()]
            class_names  = [classes.get(c, c) for c in class_ids]

            group_ids    = [g.strip() for g in el.attrib.get("groupids", "").split(",") if g.strip()]
            group_names  = []
            for gid in group_ids:
                g = groups.get(gid, {})
                group_names.append("All" if g.get("entireclass") == "1" else g.get("name", ""))

            subj_id = el.attrib.get("subjectid", "")
            lesson_map[lid] = {
                "subject":  subjects.get(subj_id, subj_id),
                "teachers": ", ".join(teacher_names) or "TBA",
                "classes":  ", ".join(class_names),
                "groups":   ", ".join(g for g in group_names if g) or "All",
            }

        for el in root.findall(".//card"):
            lesson_id = el.attrib.get("lessonid", "")
            period_num = el.attrib.get("period", "")
            days_bits  = el.attrib.get("days", "00000")
            room_ids   = [r.strip() for r in el.attrib.get("classroomids", "").split(",") if r.strip()]

            lesson = lesson_map.get(lesson_id)
            if not lesson:
                continue

            room_str   = ", ".join(rooms.get(r, r) for r in room_ids) or "TBA"
            start, end = period_map.get(period_num, ("", ""))

            for bit_pos, day_name in DAY_BITS.items():
                if bit_pos < len(days_bits) and days_bits[bit_pos] == "1":
                    self.entries.append(ScheduleEntry(
                        day        = day_name,
                        period     = int(period_num) if period_num.isdigit() else 0,
                        start_time = start,
                        end_time   = end,
                        subject    = lesson["subject"],
                        teacher    = lesson["teachers"],
                        class_name = lesson["classes"],
                        group      = lesson["groups"],
                        room       = room_str,
                    ))

    # ────────────────────────────────────────────────────
    # Smart name matching
    # ────────────────────────────────────────────────────

    def _normalise(self, s: str) -> str:
        """Lowercase, strip, collapse spaces."""
        return re.sub(r'\s+', ' ', s.strip().lower())

    def _tokenise(self, s: str) -> set:
        """Split on non-alphanumeric, return lowercase tokens."""
        tokens = set()
        for t in re.split(r'[^a-z0-9]+', s.lower()):
            if not t: continue
            # Convert ordinals like '1st', '2nd', '8th' directly to their base digits '1', '2', '8'
            m = re.match(r'^(\d+)(st|nd|rd|th)$', t)
            if m:
                tokens.add(m.group(1))
            else:
                tokens.add(t)
        return tokens

    def _class_score(self, query_tokens: set, class_name: str) -> float:
        """Score how well `query_tokens` match `class_name`.
        Higher is better. Returns 0 if not a strong match.

        Strategy:
        - Single-letter tokens (section like 'D', 'A', 'B') are HARD filters.
          If present in query, the class name must end with '-<LETTER>' or
          contain '(<LETTER>)'. If it doesn't, score = 0.
        - Roman numeral / digit tokens (semester like 'VIII') are HARD filters.
          If present in query, the class must contain that semester.
        - Multi-letter tokens (program like 'CS', 'BBA') must appear in class.
        """
        cn_lower = class_name.lower()
        cn_tokens = self._tokenise(class_name)

        # Separate query tokens by kind
        section_letters = {t for t in query_tokens if len(t) == 1 and t.isalpha()}
        roman_tokens    = {t for t in query_tokens if len(t) >= 1 and _roman_to_int(t) > 0}
        digit_tokens    = {t for t in query_tokens if t.isdigit() and int(t) <= 10}
        program_tokens  = {t for t in query_tokens
                           if len(t) >= 2 and not _roman_to_int(t) > 0 and not t.isdigit()}

        cn_expanded = set(cn_tokens)
        for t in cn_tokens:
            v = _roman_to_int(t)
            if v > 0:
                cn_expanded.add(str(v))

        # ── Hard filter 1: Section letter ───────────────
        # Class name must truly end with '-X' or contain '(... X ...)' in parentheses
        for sl in section_letters:
            sl_upper = sl.upper()
            in_suffix = bool(re.search(r'-' + sl_upper + r'$', class_name))
            in_parens = bool(re.search(r'\([^)]*\b' + sl_upper + r'\b[^)]*\)', class_name))
            if not (in_suffix or in_parens):
                return 0.0

        # ── Hard filter 2: Semester (roman or digit) ────
        for rt in roman_tokens:
            rv = _roman_to_int(rt)
            # The class must contain this roman numeral (normalised)
            cn_romans = {_roman_to_int(t) for t in cn_tokens if _roman_to_int(t) > 0}
            cn_digits  = {int(t) for t in cn_tokens if t.isdigit()}
            if rv not in cn_romans and rv not in cn_digits:
                return 0.0
        for dt in digit_tokens:
            dv = int(dt)
            cn_romans = {_roman_to_int(t) for t in cn_tokens if _roman_to_int(t) > 0}
            cn_digits  = {int(t) for t in cn_tokens if t.isdigit()}
            if dv not in cn_romans and dv not in cn_digits:
                return 0.0

        # ── Soft score: program token coverage ──────────
        if not program_tokens:
            return 1.0 if (section_letters or roman_tokens or digit_tokens) else 0.0

        cn_prog_tokens = {t for t in cn_expanded if len(t) >= 2}
        matched = sum(1 for t in program_tokens if t in cn_prog_tokens)
        return matched / len(program_tokens)

    def match_classes(self, query: str) -> List[str]:
        """Return list of matching class names from the timetable, ordered by score."""
        q_tokens = self._tokenise(query)
        # Remove stopwords
        stopwords = {"the","for","of","and","is","show","me","what","timetable",
                     "schedule","class","classes","section","semester","batch"}
        q_tokens -= stopwords

        if not q_tokens:
            return []

        scored = []
        for cn in self.all_classes:
            score = self._class_score(q_tokens, cn)
            if score > 0:
                scored.append((score, cn))

        scored.sort(key=lambda x: -x[0])

        if not scored:
            return []

        # Return all matches with score >= 50% of best score
        best = scored[0][0]
        return [cn for score, cn in scored if score >= 0.5 * best]

    def match_teachers(self, query: str) -> List[str]:
        """Return list of all teachers whose name tokens overlap with query."""
        q_tokens = self._tokenise(query)
        stopwords = {"the","for","of","and","is","teacher","professor","when","does","teach",
                     "show","me","schedule","timetable","class","classes","dr","prof","engr","sir",
                     "mr","ms","today","tomorrow","monday","tuesday","wednesday","thursday","friday"}
        q_meaningful = {t for t in q_tokens - stopwords if len(t) >= 2}

        if not q_meaningful:
            return []

        matched = []
        # Normalise list of teachers for consistent fuzzy matching
        potential_teachers = []
        for tn in self.all_teachers:
            t_tokens = self._tokenise(tn)
            # Remove title tokens from teacher name tokens for better matching
            clean_t_tokens = t_tokens - {"dr","prof","engr","mr","ms","vf"}
            potential_teachers.append((tn, t_tokens, clean_t_tokens))

        # 1. Collect all potential matches with their scores
        scored_matches = []
        for tn, t_tokens, clean_t_tokens in potential_teachers:
            if not clean_t_tokens: continue
            
            # Intersection score: how many meaningful tokens match?
            intersection = q_meaningful & clean_t_tokens
            if not intersection: continue
            
            score = len(intersection)
            
            # Bonus: if it's an exact subset or superset
            is_subset = q_meaningful <= clean_t_tokens
            is_superset = clean_t_tokens <= q_meaningful
            
            if is_subset or is_superset:
                score += 1
            
            # Extra bonus for exact match (excluding titles)
            if q_meaningful == clean_t_tokens:
                score += 2
                
            scored_matches.append((score, tn))

        # 2. If no word-based matches, try fuzzy matching
        if not scored_matches:
            import difflib
            for tn, t_tokens, clean_t_tokens in potential_teachers:
                for qw in q_meaningful:
                    m = difflib.get_close_matches(qw, list(clean_t_tokens), n=1, cutoff=0.6)
                    if m:
                        scored_matches.append((1, tn))
                        break
                
                if any(tn == sm[1] for sm in scored_matches): continue
                
                q_full = " ".join(sorted(q_meaningful))
                t_full = " ".join(sorted(clean_t_tokens))
                ratio = difflib.SequenceMatcher(None, q_full, t_full).ratio()
                if ratio > 0.6:
                    scored_matches.append((1, tn))

        if not scored_matches:
            return []

        # 3. Filter to keep only the highest scoring matches
        scored_matches.sort(key=lambda x: x[0], reverse=True)
        max_score = scored_matches[0][0]
        return [tn for score, tn in scored_matches if score == max_score]

    # ────────────────────────────────────────────────────
    # Filtering
    # ────────────────────────────────────────────────────

    def _filter(
        self,
        class_names: List[str] = [],
        teacher_names: List[str] = [],
        room_q:    str = "",
        subject_q: str = "",
        day_q:     str = "",
    ) -> List[ScheduleEntry]:
        results = self.entries

        if class_names:
            cl_set = {self._normalise(c) for c in class_names}
            results = [e for e in results
                       if any(self._normalise(c) in self._normalise(e.class_name) or
                              self._normalise(e.class_name) in self._normalise(c)
                              for c in class_names)]

        if teacher_names:
            results = [e for e in results
                       if any(tn.lower() in e.teacher.lower() for tn in teacher_names)]

        if room_q:
            results = [e for e in results if room_q.lower() in e.room.lower()]

        if subject_q:
            results = [e for e in results if subject_q.lower() in e.subject.lower()]

        if day_q:
            results = [e for e in results if day_q.lower() == e.day.lower()]

        # Sort: day order → period
        day_idx = {d: i for i, d in enumerate(DAY_ORDER)}
        results.sort(key=lambda e: (day_idx.get(e.day, 99), e.period))
        return results

    # ────────────────────────────────────────────────────
    # Output
    # ────────────────────────────────────────────────────

    def _to_markdown_table(self, entries: List[ScheduleEntry], max_rows: int = 60) -> str:
        if not entries:
            return ""

        total = len(entries)
        entries = entries[:max_rows]

        lines = ["| Day | Time | Subject | Teacher | Class | Group | Room |",
                 "|-----|------|---------|---------|-------|-------|------|"]
        for e in entries:
            t = f"{e.start_time}-{e.end_time}" if e.start_time else f"Period {e.period}"
            lines.append(f"| {e.day} | {t} | {e.subject} | {e.teacher} | {e.class_name} | {e.group} | {e.room} |")

        if total > max_rows:
            lines.append(f"\n*(Showing top {max_rows} of {total} matching slots.)*")

        return "\n".join(lines)

    # ────────────────────────────────────────────────────
    # Main entry point
    # ────────────────────────────────────────────────────

    def search(self, query: str) -> str:
        q = query.lower()

        # ── Day detection ────────────────────────────────
        day_q = ""
        
        # Exact match check first
        for d in DAY_ORDER:
            if d.lower() in q:
                day_q = d
                break
                
        # If no exact match, try fuzzy matching on words
        if not day_q:
            import difflib
            q_words = re.findall(r'\b\w+\b', q)
            day_lower_map = {d.lower(): d for d in DAY_ORDER}
            for qw in q_words:
                matches = difflib.get_close_matches(qw, list(day_lower_map.keys()), n=1, cutoff=0.75)
                if matches:
                    day_q = day_lower_map[matches[0]]
                    break

        if not day_q:
            from datetime import datetime, timedelta
            now = datetime.now()
            if "tomorrow" in q:
                day_q = (now + timedelta(days=1)).strftime("%A")
            elif "today" in q:
                day_q = now.strftime("%A")

        # ── Room detection ───────────────────────────────
        room_q = ""
        room_m = re.search(r'room[\s\-]*(\d+)', q, re.IGNORECASE)
        if room_m:
            room_q = room_m.group(1)            # just the number for fuzzy match

        # ── Teacher detection ────────────────────────────
        # Look for teacher-intent keywords
        teacher_intent = any(kw in q for kw in [
            "teacher","teach","professor","prof","dr","engr","sir","mr","ms",
            "faculty","instructor","lecturer","staff"
        ])
        teacher_names: List[str] = []
        if teacher_intent:
            teacher_names = self.match_teachers(query)

        # ── Class/section detection ──────────────────────
        class_names: List[str] = []
        # Only try class matching if query looks like a class query
        class_keywords = ["class","section","batch","program","timetable","schedule",
                          "bba","bs","be","mba","ms","phd","b.ed","media","maths","math"]
        class_intent = any(kw in q for kw in class_keywords)
        if class_intent or (not teacher_intent and not room_q):
            class_names = self.match_classes(query)
            
        # ── Robust Search Fallback ───────────────────────
        # If no classes or teachers were found, try matching teachers anyway
        # (this covers just typing a name like 'Zakria' without 'teacher')
        if not teacher_names and not class_names and not room_q:
            teacher_names = self.match_teachers(query)

        # ── Handle ambiguous teacher matches ─────────────
        if teacher_names and len(teacher_names) > 1 and not class_names:
            return (
                "[Timetable — Ambiguous Teacher Name]\n"
                f"Multiple teachers match your query. Please specify the full name:\n"
                + "\n".join(f"- {t}" for t in sorted(teacher_names))
            )

        # ── Run filter ───────────────────────────────────
        results = self._filter(
            class_names   = class_names,
            teacher_names = teacher_names,
            room_q        = room_q,
            day_q         = day_q,
        )

        if results:
            # Build a nice header
            parts = []
            if class_names:
                parts.append(f"class(es): {', '.join(class_names)}")
            if teacher_names:
                parts.append(f"teacher: {', '.join(teacher_names)}")
            if room_q:
                parts.append(f"room: {room_q}")
            if day_q:
                parts.append(f"day: {day_q}")
            header = "[Timetable — " + " | ".join(parts) + "]\n"
            return header + self._to_markdown_table(results)

        # ── Fallback for no classes ──────────────────────
        if class_names or teacher_names:
            target = ", ".join(class_names + teacher_names)
            msg = f"[Timetable] No classes found for {target}"
            if day_q: msg += f" on {day_q}"
            return msg + ".\n"

        return ""


# ── Module-level singleton ───────────────────────────────
_timetable: Optional[TimetableLookup] = None


def get_timetable() -> Optional[TimetableLookup]:
    global _timetable
    if _timetable is not None:
        return _timetable

    xml_dir   = Path(__file__).parent.parent / "data" / "timetable"
    xml_files = list(xml_dir.glob("*.xml"))
    if not xml_files:
        print("[TIMETABLE] No XML files found in data/timetable/")
        return None

    try:
        _timetable = TimetableLookup(str(xml_files[0]))
        return _timetable
    except Exception as e:
        print(f"[TIMETABLE] Error loading timetable: {e}")
        return None


def search_timetable(query: str) -> str:
    tt = get_timetable()
    if tt is None:
        return ""
    return tt.search(query)
