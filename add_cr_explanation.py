import json

filepath = "/home/zd/x-game/frontend/public/assets/blog/nonogram-strategy.json"

with open(filepath, "r", encoding="utf-8") as f:
    data = json.load(f)

# Chinese replace
zh_target = "![图](https://pica.zhimg.com/50/b0cf3a80d212e1e5c20a964dac2ac9f8_720w.jpg?source=1def8aca)\n\n我们要先从最容易填的地方下手"
zh_replacement = "![图](https://pica.zhimg.com/50/b0cf3a80d212e1e5c20a964dac2ac9f8_720w.jpg?source=1def8aca)\n\n> **小贴士**：在后文的讲解中，**C** 代表列 (Column)，**C1** 即指从左往右数的第 1 列；**R** 代表行 (Row)，**R1** 则是指从上往下数的第 1 行。\n\n我们要先从最容易填的地方下手"

if zh_target in data["zh"]["content"]:
    data["zh"]["content"] = data["zh"]["content"].replace(zh_target, zh_replacement)
    print("Updated zh content")
else:
    print("Could not find zh target string")

# English replace
en_target = "![Image](https://pica.zhimg.com/50/b0cf3a80d212e1e5c20a964dac2ac9f8_720w.jpg?source=1def8aca)\n\nWe should always start from the easiest places"
en_replacement = "![Image](https://pica.zhimg.com/50/b0cf3a80d212e1e5c20a964dac2ac9f8_720w.jpg?source=1def8aca)\n\n> **Tip**: Throughout this guide, **C** stands for Column (e.g., **C1** means Column 1 from the left), and **R** stands for Row (e.g., **R1** means Row 1 from the top).\n\nWe should always start from the easiest places"

if en_target in data["en"]["content"]:
    data["en"]["content"] = data["en"]["content"].replace(en_target, en_replacement)
    print("Updated en content")
else:
    print("Could not find en target string")

with open(filepath, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Saved file")
