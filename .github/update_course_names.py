import urllib.request
import re

COURSE_NAMES_URL = 'https://raw.githubusercontent.com/michael-maltsev/technion-course-names/gh-pages/names_new.json'

# Fetch the course names.
with urllib.request.urlopen(COURSE_NAMES_URL) as response:
    course_names = response.read().decode('utf-8')

# Read the current file.
with open('technion-scans.js', 'r') as f:
    content = f.read()

# Replace content between markers.
pattern = r'(\n\s*// technion-course-names_start\n\s*)[\s\S]*?(\n\s*// technion-course-names_end\n)'
replacement = r'\1var dict = ' + course_names.replace('\\', '\\\\') + r';\2'
new_content = re.sub(pattern, replacement, content)

# Write back to file.
with open('technion-scans.js', 'w') as f:
    f.write(new_content)
