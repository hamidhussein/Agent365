try:
    with open("seo_results.txt", "r", encoding="utf-16") as f:
        print(f.read())
except:
    with open("seo_results.txt", "r", encoding="utf-8") as f:
        print(f.read())
