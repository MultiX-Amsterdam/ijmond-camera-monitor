import sys
from util.util import InvalidUsage

def main(argv):
    value = int(argv[1])
    if value > 1:
        raise InvalidUsage("Doet het niet", status_code=400)
    return value

if __name__ == "__main__":
    value = main(sys.argv)
    print(f"Value is {value}")