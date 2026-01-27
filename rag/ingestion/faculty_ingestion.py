import requests
from bs4 import BeautifulSoup
import os
import re

BASE_URL = "https://www.iba-suk.edu.pk"

# ================== DEPARTMENT CONFIG ==================
DEPARTMENT_PAGES = [
    "https://www.iba-suk.edu.pk/faculty/computer-science",  # FIRST
    "https://www.iba-suk.edu.pk/faculty/management-science",
    "https://www.iba-suk.edu.pk/faculty/electrical-engineering",
    "https://www.iba-suk.edu.pk/faculty/computer-system-engineering",
    "https://www.iba-suk.edu.pk/faculty/education",
    "https://www.iba-suk.edu.pk/faculty/mathematics"
]

DEPARTMENT_INFO = {
    "computer-science": ("Computer Science", "Academic Block V"),
    "management-science": ("Management Science", "Academic Block II"),
    "mathematics": ("Mathematics", "Academic Block I"),
    "computer-system-engineering": ("Computer System Engineering", "Academic Block III"),
    "electrical-engineering": ("Electrical Engineering", "Academic Block III"),
    "education": ("Education", "N/A")
}

SAVE_DIR = "data/faculty"
os.makedirs(SAVE_DIR, exist_ok=True)

# ================== HELPERS ==================
def clean_text(text):
    return " ".join(text.split())

def clean_filename(name):
    name = name.lower()
    name = re.sub(r'[^a-z0-9 ]', '', name)
    return name.replace(" ", "_")

# ================== SCRAPING ==================
for dept_url in DEPARTMENT_PAGES:
    print(f"\n📘 Processing department: {dept_url}")

    soup = BeautifulSoup(requests.get(dept_url).text, "html.parser")

    dept_key = dept_url.split("/")[-1]
    department, office_extension = DEPARTMENT_INFO.get(
        dept_key, ("Unknown", "Not Available")
    )

    profile_links = set()

    # -------- ONLY extract links inside <section id="members"> --------
    members_section = soup.find("section", id="members")
    if not members_section:
        print("⚠ No members section found")
        continue

    for a in members_section.find_all("a", href=True):
        href = a["href"]
        if "/faculty/" in href and href.count("/") > 2:
            profile_links.add(BASE_URL + href) # type: ignore

    print(f"Found {len(profile_links)} faculty members")

    # ================== VISIT PROFILES ==================
    for profile_url in profile_links:
        print(f"➡ Extracting: {profile_url}")

        profile_soup = BeautifulSoup(
            requests.get(profile_url).text, "html.parser"
        )

        # -------- NAME --------
        name_tag = profile_soup.find("h2")
        name = clean_text(name_tag.text) if name_tag else "Unknown"

        # -------- DESIGNATION --------
        designation = "Not Available"
        if name_tag:
            header = name_tag.find_parent("header")
            if header:
                fig = header.find_next_sibling("figure")
                if fig:
                    designation = clean_text(fig.text)

        # -------- EMAIL --------
        email = "Not Available"
        for p in profile_soup.find_all("p"):
            if "E-mail" in p.text:
                match = re.search(r'[\w\.-]+@[\w\.-]+', p.text)
                if match:
                    email = match.group(0)
                break

        # -------- BIOGRAPHY --------
        biography = "Not Available"
        bio_header = profile_soup.find("h3", string=re.compile("Biography", re.I)) # type: ignore
        if bio_header:
            bio = []
            for sib in bio_header.find_next_siblings():
                if sib.name in ["h3", "h2"]:
                    break
                text = clean_text(sib.get_text())
                if text:
                    bio.append(text)
            if bio:
                biography = " ".join(bio)

        # -------- QUALIFICATIONS --------
        qualifications = []
        table = profile_soup.find("table")
        if table:
            for row in table.find_all("tr")[1:]:
                cols = [clean_text(td.text) for td in row.find_all("td")]
                if len(cols) == 4:
                    qualifications.append(
                        f"- {cols[0]}, {cols[1]} ({cols[2]}, {cols[3]})"
                    )

        qualification_text = (
            "\n".join(qualifications) if qualifications else "Not Available"
        )

        # -------- SAVE (OVERRIDE SAFE) --------
        filename = clean_filename(name) + ".txt"
        filepath = os.path.join(SAVE_DIR, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"Name: {name}\n")
            f.write(f"Designation: {designation}\n")
            f.write(f"Department: {department}\n")
            f.write(f"Email: {email}\n")
            f.write(f"Office Extension: {office_extension}\n\n")
            f.write("Qualifications:\n")
            f.write(qualification_text + "\n\n")
            f.write("Biography:\n")
            f.write(biography)

        print(f"Saved: {filename}")

print("\n FACULTY EXTRACTION COMPLETED (SECTION-BASED, NO DUPLICATES)")
