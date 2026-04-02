import chardet
with open('main.py', 'rb') as f:
    rawdata = f.read()
    print(chardet.detect(rawdata))
    if b'\x00' in rawdata:
        print("Null bytes found")
