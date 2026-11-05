import os
import re

directory = r"d:\do an\Freelancer_AI_Platform\frontend\src\pages"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'alert(' not in content:
        return

    # Add import if missing
    if 'import { toast } from \'react-hot-toast\'' not in content and 'import { toast } from "react-hot-toast"' not in content:
        # Find last import
        import_matches = list(re.finditer(r'^import .*;?\s*', content, re.MULTILINE))
        if import_matches:
            last_import = import_matches[-1]
            insert_pos = last_import.end()
            content = content[:insert_pos] + "import { toast } from 'react-hot-toast';\n" + content[insert_pos:]
        else:
            content = "import { toast } from 'react-hot-toast';\n" + content

    def replace_alert(match):
        inner_text = match.group(1)
        lower_text = inner_text.lower()
        if 'thành công' in lower_text or 'success' in lower_text or 'saved' in lower_text:
            return f"toast.success({inner_text})"
        elif any(word in lower_text for word in ['lỗi', 'error', 'thất bại', 'không thể', 'vui lòng', 'chưa', 'cảnh báo', 'failed', 'phải']):
            return f"toast.error({inner_text})"
        else:
            return f"toast({inner_text})"

    # Regex to match alert(...) allowing nested parentheses is hard, but usually it's alert(...) on one line
    # Wait, some are multi-line. Let's use a simple approach: just replace \balert\( with toast.success/toast.error based on line context
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if 'alert(' in line:
            # simple replacement
            lower_line = line.lower()
            if 'thành công' in lower_line or 'success' in lower_line or 'saved' in lower_line:
                new_lines.append(re.sub(r'\balert\(', 'toast.success(', line))
            elif any(word in lower_line for word in ['lỗi', 'error', 'thất bại', 'không thể', 'vui lòng', 'chưa', 'cảnh báo', 'failed', 'phải']):
                new_lines.append(re.sub(r'\balert\(', 'toast.error(', line))
            else:
                new_lines.append(re.sub(r'\balert\(', 'toast(', line))
        else:
            new_lines.append(line)
            
    content = '\n'.join(new_lines)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Refactored {os.path.basename(filepath)}")

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
