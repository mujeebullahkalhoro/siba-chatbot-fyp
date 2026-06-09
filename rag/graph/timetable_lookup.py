# rag/graph/timetable_lookup.py
"""
Parses aSc Timetable XML export and provides fast in-memory lookup
for timetable queries (by class/section, teacher, room, subject, day).

Key design decisions:
- Direct candidate scoring against known names (no fragile regex for names)
- Section-aware matching: "BS CS VIII D" -> BS-VIII(CS)-D
- Ambiguous teacher names produce a clarification response
"""

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime

# -- Day bitmask mapping ----------------------------------
DAY_BITS   = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday"}
DAY_ORDER  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# Roman numeral -> integer
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
        self.all_subjects:  List[str]           = []   # all known subject names
        self._parse(xml_path)
        print(f"[TIMETABLE] Loaded {len(self.entries)} entries, "
              f"{len(self.all_classes)} classes, {len(self.all_teachers)} teachers")

    # ----------------------------------------------------
    # XML parsing
    # ----------------------------------------------------
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
            if name and name not in self.all_subjects:
                self.all_subjects.append(name)

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

    # ----------------------------------------------------
    # Smart name matching
    # ----------------------------------------------------

    def _normalise(self, s: str) -> str:
        """Lowercase, strip, collapse spaces."""
        return re.sub(r'\s+', ' ', s.strip().lower())

    def _tokenise(self, s: str) -> set:
        """Split on non-alphanumeric, return lowercase tokens."""
        tokens = set()
        for t in re.split(r'[^a-z0-9]+', s.lower()):
            if not t: continue
            
            # Split combined program names into individual parts
            if t == 'bscs':
                tokens.update(['bs', 'cs'])
            elif t == 'bsse':
                tokens.update(['bs', 'se'])
            elif t == 'bsai':
                tokens.update(['bs', 'ai'])
            elif t == 'bsaf':
                tokens.update(['bs', 'a', 'f'])
            elif t == 'bsmaths':
                tokens.update(['bs', 'maths'])
            elif t == 'bsmedia':
                tokens.update(['bs', 'media'])
            elif t == 'mscs':
                tokens.update(['ms', 'cs'])
            elif t == 'msse':
                tokens.update(['ms', 'se'])
            elif t == 'msmaths':
                tokens.update(['ms', 'maths'])
            elif t == 'phdcs':
                tokens.update(['phd', 'cs'])
            elif t == 'phdse':
                tokens.update(['phd', 'se'])
            elif t == 'phdmaths':
                tokens.update(['phd', 'maths'])
            elif t == 'becse':
                tokens.update(['be', 'cse'])
            elif t == 'beee':
                tokens.update(['be', 'ee'])
            elif t == 'bspess':
                tokens.update(['bs', 'pe', 'ss'])
            else:
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
        """
        cn_lower = class_name.lower()
        cn_tokens = self._tokenise(class_name)

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

        # Hard filter 1: Section letter
        for sl in section_letters:
            sl_upper = sl.upper()
            in_suffix = bool(re.search(r'-' + sl_upper + r'$', class_name))
            in_parens = bool(re.search(r'\([^)]*\b' + sl_upper + r'\b[^)]*\)', class_name))
            if not (in_suffix or in_parens):
                return 0.0

        # Hard filter 2: Semester
        # Expand mapping: 1->I, 2->II, 3->III, 4->IV, 5->V, 6->VI, 7->VII, 8->VIII
        # This handles cases where user says 'semester 6' but timetable uses 'VI'
        cn_romans = {_roman_to_int(t) for t in cn_tokens if _roman_to_int(t) > 0}
        cn_digits  = {int(t) for t in cn_tokens if t.isdigit()}
        cn_all_numeric = cn_romans | cn_digits

        for rt in roman_tokens:
            if _roman_to_int(rt) not in cn_all_numeric:
                return 0.0
        for dt in digit_tokens:
            if int(dt) not in cn_all_numeric:
                return 0.0

        # Soft score
        if not program_tokens:
            return 1.0 if (section_letters or roman_tokens or digit_tokens) else 0.0

        cn_prog_tokens = {t for t in cn_expanded if len(t) >= 2}
        matched = sum(1 for t in program_tokens if t in cn_prog_tokens)
        return matched / len(program_tokens)

    def match_classes(self, query: str) -> List[str]:
        """Return list of matching class names from the timetable, ordered by score."""
        q_tokens = self._tokenise(query)
        stopwords = {"the","for","of","and","is","are","show","me","what","timetable",
                     "schedule","scheduled","class","classes","section","semester","batch",
                     "will","be","when","who","which","where","how","days",
                     "free","have","has","no","dr","prof","sir","mr","ms",
                     "he","she","they","his","her","on","in","at","to",
                     "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
                     "today","tomorrow","can","i","get","list","all","subjects"}
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

        best = scored[0][0]
        # Prevent very weak false positives (e.g. from stray tokens matching 'BS' or 'BE')
        if best < 0.3:
            return []
            
        return [cn for score, cn in scored if score >= 0.5 * best]

    # Known spelling variants: map user-typed variant -> canonical form in timetable
    _SPELLING_VARIANTS = {
        "zakria":      "zakriya",
        "zakhria":     "zakriya",
        "zakhirya":    "zakriya",
        "asadulah":    "asadullah",
        "ahsanulah":   "ahsanullah",
        "sanaulah":    "sanaullah",
        "amanulah":    "amanullah",
        "ubedullah":   "ubaidullah",
        "ubaidulah":   "ubaidullah",
        "waliulah":    "waliullah",
        "inamulah":    "inamullah",
        "zafarulah":   "zafarullah",
        "fasial":      "faisal",
        "faisl":       "faisal",
        "ismal":       "ismail",
        "ismael":      "ismail",
        "imsail":      "ismail",
        "kamren":      "kamran",
        "khaleel":     "khalil",
    }

    def _normalise_token(self, token: str) -> str:
        """Apply known spelling corrections to a single token."""
        return self._SPELLING_VARIANTS.get(token, token)

    def _token_match_score(self, query_word: str, teacher_word: str) -> int:
        """Score how well a single query token matches a single teacher name token.
        Returns a tiered score:
          10 = exact match
           8 = one is a substring of the other (len >= 4)
           7 = same prefix of >= 4 characters
           5 = high-confidence fuzzy match (with prefix guard for long tokens)
           0 = no match
        """
        # Tier 1: exact match
        if query_word == teacher_word:
            return 10

        # Hard Guard: If both tokens are long, they MUST share first character
        # This prevents "Ahsanullah" (A) from matching "Sanaullah" (S)
        if len(query_word) >= 4 and len(teacher_word) >= 4:
            if query_word[0] != teacher_word[0]:
                return 0

        # Tier 2: substring or prefix match (to handle truncation like Abro -> Abr)
        if len(query_word) >= 4 and len(teacher_word) >= 4:
            if query_word.startswith(teacher_word) or teacher_word.startswith(query_word):
                # If query is LONGER than teacher token (e.g. 'asadullah' contains 'asad'),
                # score lower (7) to avoid false ambiguity with the shorter name.
                # If teacher is longer or equal (prefix truncation like 'abro' vs 'abroo'), score high (9).
                if len(query_word) > len(teacher_word):
                    return 7   # query contains teacher as prefix → weaker signal
                return 9       # teacher contains query as prefix → strong truncation match
            if query_word in teacher_word or teacher_word in query_word:
                return 8

        # Tier 3: shared prefix (>= 4 chars match)
        min_len = min(len(query_word), len(teacher_word))
        if min_len >= 4:
            prefix_len = 0
            for a, b in zip(query_word, teacher_word):
                if a == b:
                    prefix_len += 1
                else:
                    break
            if prefix_len >= 4:
                return 7

        # Tier 4: fuzzy match with guards
        # For longer tokens (compound names like "ahsanullah"), require higher
        # similarity AND matching first 3 chars to prevent cross-name contamination
        if len(query_word) >= 3 and len(teacher_word) >= 3:
            import difflib
            ratio = difflib.SequenceMatcher(None, query_word, teacher_word).ratio()

            if len(query_word) >= 6 or len(teacher_word) >= 6:
                # Long compound names: require high similarity.
                # Prefix guard (first 3 chars) is usually good, but we relax it 
                # if the similarity is very high (>= 0.85) to allow for mid-name transpositions like imsail/ismail.
                if ratio >= 0.85:
                    return 5
                if ratio >= 0.82 and query_word[:3] == teacher_word[:3]:
                    return 5
            else:
                # Short names: standard fuzzy match with reasonable cutoff
                if ratio >= 0.80:
                    return 5

        return 0

    def match_teachers(self, query: str) -> List[tuple]:
        """Return list of (score, name) pairs for matching teachers.
        
        Uses a tiered scoring algorithm:
        - Exact token match:      10 pts per token
        - Substring containment:   8 pts per token
        - Prefix match (≥4 char):  7 pts per token
        - Fuzzy match (guarded):   5 pts per token
        
        Bonuses:
        - All teacher name tokens matched via EXACT hits: +5
        - Title (dr/engr/prof) matched: +3
        - Full query matches teacher name exactly: +5
        """
        q_tokens = self._tokenise(query)
        stopwords = {"the","for","of","and","is","teacher","professor","when","does","teach",
                     "show","me","schedule","timetable","class","classes","dr","prof","engr","sir",
                     "mr","ms","today","tomorrow","monday","tuesday","wednesday","thursday","friday",
                     "what","are","who","where","how","can","i","get","list","subjects"}
        q_meaningful = {t for t in q_tokens - stopwords if len(t) >= 2}

        if not q_meaningful:
            return []

        # Apply spelling normalization to query tokens
        q_meaningful_normalised = {self._normalise_token(t) for t in q_meaningful}

        potential_teachers = []
        for tn in self.all_teachers:
            t_tokens = self._tokenise(tn)
            clean_t_tokens = t_tokens - {"dr","prof","engr","mr","ms","vf"}
            potential_teachers.append((tn, t_tokens, clean_t_tokens))

        scored_matches = []
        for tn, t_tokens, clean_t_tokens in potential_teachers:
            if not clean_t_tokens:
                continue

            # Score each query token against each teacher token, take best per query token
            matched_teacher_tokens = set()   # teacher tokens that were matched
            exact_matched_tokens   = set()   # teacher tokens matched via exact hit
            total_token_score      = 0
            has_any_match          = False

            for qw in q_meaningful_normalised:
                best_score   = 0
                best_t_token = None
                for tw in clean_t_tokens:
                    s = self._token_match_score(qw, tw)
                    if s > best_score:
                        best_score   = s
                        best_t_token = tw

                if best_score > 0:
                    has_any_match = True
                    total_token_score += best_score
                    matched_teacher_tokens.add(best_t_token)
                    if best_score == 10:
                        exact_matched_tokens.add(best_t_token)

            if not has_any_match:
                continue

            score = total_token_score

            # Bonus: all teacher name tokens were matched via EXACT hits
            if exact_matched_tokens == clean_t_tokens:
                score += 5
                # Extra if teacher has no titles (simple name fully matched)
                # but ONLY if user didn't explicitly ask for a title
                if len(clean_t_tokens) == len(t_tokens) and not (q_tokens & {"dr","prof","engr","mr","ms"}):
                    score += 2

            # Bonus/penalty: title matching
            titles = t_tokens - clean_t_tokens
            query_titles = q_tokens & {"dr","prof","engr","mr","ms"}
            if query_titles:
                if query_titles & titles:
                    # User asked for dr/engr/etc and teacher has that title → bonus
                    score += 3
                elif titles:
                    # User asked for different title than teacher has → penalty
                    score -= 3
                else:
                    # User asked for a title but teacher has no title → strong penalty
                    score -= 5
            elif titles and (q_tokens & titles):
                # Title present in query but not in stopwords? Grant bonus
                score += 3

            # Bonus: full exact match (query tokens == teacher tokens including titles)
            q_clean = q_tokens - {"the","for","of","and","is","show","me","what","who",
                                  "timetable","schedule","class","classes","teacher","professor"}
            if q_clean == t_tokens:
                score += 5

            scored_matches.append((score, tn))

        return sorted(scored_matches, key=lambda x: x[0], reverse=True)

    def match_subjects(self, query: str) -> List[str]:
        """Return list of matching subject names from the timetable."""
        q_tokens = self._tokenise(query)
        stopwords = {"the","for","of","and","is","are","show","me","what","timetable",
                     "schedule","scheduled","class","classes","section","semester","batch",
                     "will","be","when","who","which","where","how","days",
                     "free","have","has","no","dr","prof","sir","mr","ms",
                     "he","she","they","his","her","on","in","at","to",
                     "today","tomorrow","can","i","get","list","all","subjects",
                     "teaching", "teach", "teacher", "professor"}
        q_tokens -= stopwords
        
        if not q_tokens:
            return []
            
        scored = []
        for sn in self.all_subjects:
            sn_tokens = self._tokenise(sn)
            matched = sum(1 for t in q_tokens if t in sn_tokens)
            if matched > 0:
                score = matched / max(len(q_tokens), len(sn_tokens))
                scored.append((score, sn))
                
        scored.sort(key=lambda x: -x[0])
        if not scored: return []
        
        best = scored[0][0]
        if best < 0.3: return []
        return [sn for score, sn in scored if score >= 0.8 * best]

    # ────────────────────────────────────────────────────
    # Filtering
    # ────────────────────────────────────────────────────

    def _filter(
        self,
        class_names: List[str] = [],
        teacher_names: List[str] = [],
        subject_names: List[str] = [],
        room_q:    str = "",
        day_q:     str = "",
    ) -> List[ScheduleEntry]:
        results = self.entries

        # Subject Filter
        if subject_names:
            results = [e for e in results if any(s.lower() in e.subject.lower() or e.subject.lower() in s.lower() for s in subject_names)]

        # Strict Filter: If class_names were provided as a filter, only keep those entries.
        # If class_names is an empty list but a class filter was INTENDED (strict_class=True),
        # then we return nothing (this prevents semester-fallback errors).
        if class_names is not None:
            if not class_names:
                return []
            results = [e for e in results
                       if any(self._normalise(c) in self._normalise(e.class_name) or
                              self._normalise(e.class_name) in self._normalise(c)
                              for c in class_names)]

        if teacher_names:
            # teacher_names are canonical names from the data (like "Dr. Asif Khan")
            # e.teacher might be "Dr. Asif Khan" or "Asif" or "Dr. A, Dr. B" (co-taught)
            # We must ensure that "Asif" doesn't match "Dr. Asif Khan" via a loose "in" check.
            def _teacher_entry_matches(entry_teacher_str, targets):
                # Split entry by comma to handle co-taught
                individual_teachers = [t.strip().lower() for t in entry_teacher_str.split(',')]
                target_lowers = [t.lower() for t in targets]
                # Match if ANY target is found as a whole name in the entry
                return any(t in individual_teachers for t in target_lowers)

            results = [e for e in results if _teacher_entry_matches(e.teacher, teacher_names)]

        if room_q:
            results = [e for e in results if room_q.lower() in e.room.lower()]

        if day_q:
            results = [e for e in results if day_q.lower() == e.day.lower()]

        # Sort: day order -> period
        day_idx = {d: i for i, d in enumerate(DAY_ORDER)}
        results.sort(key=lambda e: (day_idx.get(e.day, 99), e.period))
        return results

    # ────────────────────────────────────────────────────
    # Output
    # ────────────────────────────────────────────────────

    def _to_markdown_table(self, entries: List[ScheduleEntry], max_rows: int = 60) -> str:
        if not entries: return ""
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
    def search(self, query: str, now: Optional[datetime] = None) -> str:
        q = query.lower()

        # Day detection
        day_q = ""
        for d in DAY_ORDER:
            if d.lower() in q:
                day_q = d
                break
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
            from datetime import timedelta
            # Ensure we use an absolute reference for relative dates
            if now is None:
                # Fallback to PKT manually if not provided (rare)
                from datetime import timezone
                now = datetime.now(timezone(timedelta(hours=5)))

            if "tomorrow" in q:
                target_date = now + timedelta(days=1)
                day_q = target_date.strftime("%A")
            elif "today" in q:
                day_q = now.strftime("%A")

        # Room detection
        room_q = ""
        room_m = re.search(r'room[\s\-]*(\d+)', q, re.IGNORECASE)
        if room_m: room_q = room_m.group(1)

        # Teacher detection
        teacher_intent = any(re.search(r'\b' + kw + r'\b', q) for kw in ["teacher","teach","prof","dr","engr","sir","mr","ms"])
        scored_teacher_matches = []
        if teacher_intent:
            scored_teacher_matches = self.match_teachers(query)

        # Class detection
        class_names: List[str] = []
        class_keywords = ["class","section","batch","program","timetable","schedule",
                          "bba","bs","be","mba","ms","phd","b.ed","media","math"]
        class_intent = any(re.search(r'\b' + kw + r'\b', q) for kw in class_keywords)
        if class_intent or (not teacher_intent and not room_q):
            class_names = self.match_classes(query)

        # Subject detection
        subject_names: List[str] = []
        if not scored_teacher_matches and not class_names:
            subject_names = self.match_subjects(query)
            
        if not scored_teacher_matches and not class_names and not subject_names and not room_q:
            # Fallback: try matching everything
            scored_teacher_matches = self.match_teachers(query)
            if not scored_teacher_matches:
                class_names = self.match_classes(query)
            if not scored_teacher_matches and not class_names:
                subject_names = self.match_subjects(query)

        # If STILL nothing found (no teacher, no class, no subject, no room AND no day), return empty
        if not scored_teacher_matches and not class_names and not subject_names and not room_q and not day_q:
            return ""

        teacher_names:  List[str] = []
        similar_names:  List[str] = []
        
        if scored_teacher_matches:
            max_score = scored_teacher_matches[0][0]
            # Use relative threshold: teachers within a tight range of top score are "matches"
            # If we have a high-confidence match (>=10), we use a very tight threshold (85% or -3)
            # to exclude loose fuzzy matches (like Sanaullah matching Ahsanullah).
            if max_score >= 10:
                # If we have a clear, high-confidence winner, be extremely aggressive:
                # 1. Must be within 85% of top score
                # 2. Must be within 2 points of top score (e.g., 15 vs 13)
                match_threshold = max(max_score * 0.85, max_score - 2)
                teacher_names = [tn for s, tn in scored_teacher_matches if s >= match_threshold]
                similar_names = [tn for s, tn in scored_teacher_matches
                                 if s < match_threshold and s >= max_score * 0.40]
            else:
                teacher_names = [tn for s, tn in scored_teacher_matches if s >= 0.8 * max_score]

        # Determine if a SPECIFIC class identifier was used (semester number, section, or program)
        # We don't want to enforce strictness for a generic "classes on Monday" query.
        specific_class_id = any(re.search(r'\b' + kw + r'\b', q) for kw in ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","semester","section","batch","group"])
        strict_class_filter = None
        if class_names:
            strict_class_filter = class_names
        elif class_intent and specific_class_id:
            # We found an intent for a specific class but no name matched.
            # Enforce an EMPTY filter so we return zero results rather than all.
            strict_class_filter = []

        results = self._filter(class_names=strict_class_filter, teacher_names=teacher_names, subject_names=subject_names, room_q=room_q, day_q=day_q)

        if results:
            parts = []
            if class_names: parts.append(f"class(es): {', '.join(class_names)}")
            if teacher_names: parts.append(f"teacher: {', '.join(teacher_names)}")
            if subject_names: parts.append(f"subject: {', '.join(subject_names)}")
            if room_q: parts.append(f"room: {room_q}")
            if day_q:
                parts.append(f"day: {day_q}")
            else:
                parts.append("ALL DAYS (no day filter applied — show complete week schedule)")

            # Add an anchoring date/day reasoning for the LLM
            today_day = now.strftime("%A") if now else "Unknown"
            day_reasoning = ""
            if "tomorrow" in q and day_q:
                day_reasoning = f" (User asked for 'tomorrow'. Since Today is {today_day}, Tomorrow is {day_q})"
            elif "today" in q and day_q:
                day_reasoning = f" (User asked for 'today'. Since Today is {today_day})"

            header = f"[Timetable — " + " | ".join(parts) + f"]{day_reasoning}\n"
            footer = ""
            if similar_names:
                footer = "\n\n*(Note: Found teachers with similar names: " + ", ".join(similar_names[:5]) + ")*"
            return header + self._to_markdown_table(results) + footer

        if class_names or teacher_names or room_q:
            target_list = class_names + teacher_names
            if room_q: target_list.append(f"Room {room_q}")
            target = ", ".join(target_list)
            
            msg = f"[Timetable] No classes found for {target}"
            if day_q:
                msg += f" on {day_q}"
            return msg + ".\n"
        return ""


# Singleton
_timetable: Optional[TimetableLookup] = None

def get_timetable() -> Optional[TimetableLookup]:
    global _timetable
    if _timetable is not None: return _timetable
    xml_dir   = Path(__file__).parent.parent / "data" / "timetable"
    xml_files = list(xml_dir.glob("*.xml"))
    if not xml_files: return None
    try:
        # Load and merge ALL XML files in the directory
        main_tt = TimetableLookup(str(xml_files[0]))
        for extra_xml in xml_files[1:]:
            main_tt._parse(str(extra_xml))
        _timetable = main_tt
        return _timetable
    except Exception as e:
        print(f"[TIMETABLE] Error: {e}")
        return None

def search_timetable(query: str, now: Optional[datetime] = None) -> str:
    tt = get_timetable()
    return tt.search(query, now=now) if tt else ""
