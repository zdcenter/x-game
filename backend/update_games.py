import os
import glob

engine_dir = 'internal/engine'
for root, dirs, files in os.walk(engine_dir):
    for file in files:
        if file.endswith('.go'):
            filepath = os.path.join(root, file)
            game_id = os.path.basename(root)
            
            # Skip if it's the root engine dir
            if game_id == 'engine':
                continue
                
            with open(filepath, 'r') as f:
                content = f.read()
                
            if 'func init() {' in content:
                # Add engine.RegisterGame if not already there
                if 'engine.RegisterGame' not in content:
                    new_content = content.replace(
                        'func init() {',
                        f'func init() {{\n\tengine.RegisterGame("{game_id}")'
                    )
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {filepath} with game_id {game_id}")
