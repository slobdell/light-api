from mutagen import File

file = File('test.mp3') # mutagen can automatically detect format and type of tags
artwork = file.tags['APIC:'].data # access APIC frame and grab the image
print artwork
print "%s" % type(artwork)
print "%s" % type(artwork)
print "%s" % type(artwork)
print "%s" % type(artwork)
with open('image.jpg', 'wb') as img:
   img.write(artwork) # write artwork to new image
