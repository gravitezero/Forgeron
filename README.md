Forgeron [fɔ ʀ ʒ ə ʀ ɔ ̃]
=========================

Forgeron is static site generator written in Nodejs, it's greatly inspired by flatiron's Blacksmith.  
The name is the french translation of blacksmith. (I'm french, and I was out of imagination while naming this project).  
  

For the moment, Forgeron is only an apprentice, but it still can do some nice gears.

How to use it
=============

Forgeron basically copy and transform files from sources directory, to public.  
Forgeron currently understand 3 kind of files : html, mdwn and less.  
- *less* files are the stylesheets, they are converted to css.
- *mdwn* files are the pages content.
- *html* files are the pages templates.

Forgeron will take every page, bind it to a template and put it in the same path in the public directory.  

Each page contains the page content, written in markdown, plus the meta data.
Forgeron is very flexible about metadata, he understand some few basic command, and for *every* meta data he don't understand, he will try to bind it to the template.  

# Meta data
- *template* specify the template name (not path, that's mean no doublon, or it will crash).
- *header* will bind a specific page *with* its template before the current page content, or in the header tag is there is one.
- *footer* will bind a specific page *with* its template after the current page content, or in the footer tag is there is one.
- *assets* does nothing for the moment, but it might be useful later
- *collection* does nothin neither, but in a futur release, it will gather every page in a folder, then add them after the current page content.
- *content* is the marked content of the page.


# Binding

Forgeron take all these meta data to build a document.
Each key in the metadata is a selector to find the tag to bind to in the template.
For example :
- the date meta data will be bound to the date tag in the page.
- the #author will be bound to the tag with the author id.
- the .tags will be bound to the tag with the tags class.

