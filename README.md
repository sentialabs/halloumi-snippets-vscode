# halloumi-snippets README

This extension provides a set of Halloumi code snippets to use with the Halloumi DSL.

## Features

Nothing super special, just code snippets :)

\!\[Snippet Selection\]\(images/snippet-selection.png\)

\!\[Code Generation\]\(images/snippet.png\)

## Requirements

This plugin does not require you to install any additional requirements

## Extension Settings

This extension does not contribute any additional settings

## Release notes

### 0.1.0

* Initial release of extension

### 0.2.0

* Reformatted the way resource snippets are generated
* Grouped required properties away from the non-required properties
* Added VirtualResource
* Added support for `output` 

### 0.3.0

* Reformatted the way resource snippets are generated
* Add property type support
* Fix update type description
* Add additional whiteline after resource for easy adding additional resources
* Fix bug with not showing properties
* Add icon to package

### 0.4.0

* Add snippet generation for non-primitive types
* Recurse on nested properties
* Limit snippets for lists to 1 example

## Development

To contribute:

1. Clone this project
2. Branch of from master
3. Make you changes
4. Create a PR

To update snippets:

1. Change directory into project
2. Run `npm install`
3. Run `npm run update-snippets`