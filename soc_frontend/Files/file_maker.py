from pathlib import Path
import time
import random
import string

folder = Path(__file__).parent
folder.mkdir(exist_ok=True)

for file in folder.glob("*.txt"):
    if file.is_file():
        content = file.read_text(errors="ignore")
        file.write_text(content + "\nMODIFIED")
        print(f"File Modified {file}")
        time.sleep(0.2)
        
num_files = 20
size = 1000
extensions = [".docx", ".pdf", ".xlsx", ".zip", ".txt"]

for i in range(num_files):
    ext = random.choice(extensions)
    filename = folder / f"document_{i}{ext}"
    
    file_content = ''.join(random.choices(string.ascii_letters + string.digits, k=size))
    filename.write_text(file_content)
    time.sleep(0.05)
print(f"DANGER - Created {num_files} files on the folder {folder}")