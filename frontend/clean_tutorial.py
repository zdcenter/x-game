import os
import re
import glob

def clean_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove imports
    content = re.sub(r"import\s*\{\s*TutorialOverlayComponent\s*\}\s*from\s*'[^']+';\n?", "", content)
    content = re.sub(r"import\s*\{\s*TutorialService\s*\}\s*from\s*'[^']+';\n?", "", content)

    # Remove from imports array
    content = re.sub(r",\s*TutorialOverlayComponent", "", content)
    content = re.sub(r"TutorialOverlayComponent\s*,?", "", content)

    # Remove DI injection
    content = re.sub(r"private\s+tutorialService\s*=\s*inject\(TutorialService\);\n?", "", content)

    # Remove properties
    content = re.sub(r"\s*showTutorial\s*=\s*signal\([^)]+\);\n?", "", content)
    content = re.sub(r"\s*tutorialSteps\s*=\s*this\.tutorialService\.getStepsForGame\([^)]+\);\n?", "", content)

    # Remove template references
    content = re.sub(r"\s*<app-tutorial-overlay[^>]+>\s*</app-tutorial-overlay>\n?", "", content)
    content = re.sub(r"\s*<app-tutorial-overlay[^>]+\s*/>\n?", "", content)
    
    # Also handle the @if wrapper if present
    content = re.sub(r"\s*@if\s*\(\s*showTutorial\(\)\s*\)\s*\{\s*<app-tutorial-overlay[^>]+>\s*</app-tutorial-overlay>\s*\}\n?", "", content)

    # Remove initialization logic
    content = re.sub(r"\s*if\s*\(\!this\.tutorialService\.hasSeen[^}]+\}\n?", "", content)
    
    # Remove onTutorialDone method
    content = re.sub(r"\s*(public |private )?onTutorialDone\(\)[^}]+this\.showTutorial\.set\(false\);\s*\}\n?", "", content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned {path}")

ts_files = glob.glob('src/app/features/games/**/*.ts', recursive=True)
html_files = glob.glob('src/app/features/games/**/*.html', recursive=True)

for f in ts_files + html_files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    if 'TutorialOverlayComponent' in content or 'TutorialService' in content or 'app-tutorial-overlay' in content or 'tutorialSteps' in content:
        clean_file(f)

