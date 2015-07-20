import sys


str_to_replace = "images/"
end_char = "\""


def clean_string(entire_string):
    start_index = 0
    new_str = ""
    while start_index < len(entire_string):
        try:
            next_instance_index = entire_string.index(str_to_replace, start_index)
        except ValueError:
            new_str += entire_string[start_index:]
            break
        new_str += entire_string[start_index: next_instance_index]
        end_index = entire_string.index(end_char, next_instance_index)
        str_to_modify = entire_string[next_instance_index: end_index]
        str_to_modify = "%s%s%s" % ("{% static '", str_to_modify, "' %}")
        new_str += str_to_modify
        start_index = end_index
    return new_str


def make_static(target_file):
    with open(target_file, "rb") as read_file:
        entire_string = read_file.read()
        new_html = clean_string(entire_string)
    with open("updated-%s" % target_file, "w+") as write_file:
        write_file.write(new_html)

if __name__ == "__main__":
    target_file = sys.argv[1]
    make_static(target_file)
