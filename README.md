# test.js

Combinational test framework.

This is not meant as a replacement for more advanced and feature-rich testing 
frameworks, instead this is a minimalist and complete experimental implementation
of a specific approach to testing, i.e. _combinational testing_

Note, **this module is experimental** and can change quite allot within a shot to mid
timeframe, use at your own risk, though ideas, feedback and suggestions are welcome.

## Features

- Simple / minimalist implementation
- Supports combinational as well as unit testing paradigms
- 


### Planned

- Multiple modifier chaining
- Replaceable/extensible assertion library
-  


## Contents
- [test.js](#testjs)
  - [Features](#features)
    - [Planned](#planned)
  - [Contents](#contents)
  - [Architecture](#architecture)
    - [Combinational testing](#combinational-testing)
    - [Unit testing](#unit-testing)
  - [Installation](#installation)
  - [Basic usage](#basic-usage)
  - [CLI](#cli)
  - [Components](#components)
    - [`DEFAULT_TEST_FILES`](#default_test_files)
    - [`IGNORE_TEST_FILES`](#ignore_test_files)
    - [`Merged(..)`](#merged)
      - [`<merged>.members`](#mergedmembers)
      - [`<merged>.size` / `<merged>.usize`](#mergedsize--mergedusize)
      - [`<merged>.add(..)` / `<merged>.remove(..)`](#mergedadd--mergedremove)
      - [`<merged>.clear()`](#mergedclear)
      - [`<merged>.keys(..)` / `<merged>.values(..)` / `<merged>.entries(..)`](#mergedkeys--mergedvalues--mergedentries)
      - [`<merged>.toObject(..)`](#mergedtoobject)
      - [`<merged>.checkShadowing(..)`](#mergedcheckshadowing)
      - [`<merged>.handleShadowing(..)`](#mergedhandleshadowing)
      - [`<member>.filename`](#memberfilename)
    - [`Setups(..)` / `Setup(..)` (Merged)](#setups--setup-merged)
    - [`Modifiers(..)` / `Modifier(..)` (Merged)](#modifiers--modifier-merged)
    - [`Tests(..)` / `Test(..)` (Merged)](#tests--test-merged)
    - [`Cases(..)` / `Case(..)` (Merged)](#cases--case-merged)
    - [`Assert(..)`](#assert)
    - [`run(..)`](#run)
  - [Advanced components](#advanced-components)
    - [`runner(..)`](#runner)
    - [`parser(..)`](#parser)
  - [Utilities](#utilities)
    - [`getCallerFilename()`](#getcallerfilename)
  - [License](#license)


## Architecture

This package implements two testing schemes:
- Combinational testing  
  Here the user sets up a set of `Setup`, `Modifier` and `Test` functions and the system
  chains different combinations of the three and runs them.
- Unit testing  
  Simple independent tests.


### Combinational testing

In general the idea here is that you define three things:

 - `Setups` that build a test context and objects (the _setup_),
 - `Modifiers` that modify the _setup_ in some way,
 - `Tests` that test some aspect of a _setup_.

The system builds chains in the form:
```
setup -> modifier* -> test
```

Where `modifier` can me either single or a chain of modifiers.

A `setup` and `modifier` can also include assertions/tests for direct testing and 
sanity checks.

The system defines a blank pass-through modifier and test, to alleviate the requirement 
on the user to define at least one modifier and test, so in cases where it makes no 
sense only a setup is required.

Note that each element can reference and re-use other elements so for example a 
modifier can call (re-use) other modifiers to avoid code duplication.

This makes it simple to define procedural/generative tests.


### Unit testing

This is the traditional self-contained test approach.


## Installation

```shell_session
$ npm install -i ig-test
```

And to install the global CLI interface
```shell_session
$ npm install -g ig-test
```


## Basic usage

Create a test script
```shell_session
$ touch test.js
$ chmod +x test.js
```

Note that the test script should be named either `"test.js"` or `"<something>-test.js"`
for the system to find it automatically.

The code:
```javascript
#!/usr/bin/env node

var test = require('ig-test')

// XXX add assert examples...

test.Setups({
    state: function(assert){
        return {
            a: 123,
            b: 321,
        } },
})

test.Modifiers({
    inc: function(assert, state){
        Object.keys(state)
            .forEach(function(k){
                state[k] += 1 })
        return state },    
})

test.Tests({
    
})

test.Cases({
    
})

// make the test runnable as a standalone script...
__filename == (require.main || {}).filename
    && tests.run()
```

Run the tests
```shell_session
$ node ./test.js
```

or
```shell_session
$ runtests
```

## CLI

```shell_session
$ npm install -g ig-test
```

Basic help
```shell_session
$ runtests --help 
Usage: test.js [OPTIONS] [CHAIN] ...

Run tests.

Tests run by test.js can be specified in one of the 
following formats:

        <case>
        <setup>:<test>
        <setup>:<modifier>:<test>

Each of the items in the test spec can be a "*" indicating
that all relevant items should be used, for example:

        $ ./test.js basic:*:*

Here test.js is instructed to run all tests and modifiers
only on the basic setup.

Zero or more sets of tests can be specified.

When no tests specified test.js will run all tests.

Options:
        -h,  --help             - print this message and exit
        -v,  --version          - show test.js verion and exit
        -l,  --list=PATH        - list available tests;
                                  note that if passing files via -f explicitly they
                                  must precede the -l/-list flag;
                                  this has the same defaults as -f
             --list-found=PATH  - like -list but print found test modules and exit
        -f,  --test-file=PATH   - test script or filename pattern, supports glob;
                                  this flag can be given multiple times for
                                  multiple paths/patterns
                                  (default: **/?(*-)test.js)
        -i,  --ignore=PATH      - path/pattern to ignore in test file search
                                  (default: node_modules/**)
             --verbose          - verbose mode
                                  (env: $VERBOSE)

Examples:
        $ ./test.js             - run all tests.
        $ ./test.js basic:*:*   - run all tests and modifiers on "basic" setup.
                                  (see test.js -l for more info)
        $ ./test.js -v example  - run "example" test in verbose mode.
        $ ./test.js native:gen3:methods init:gen3:methods
                                - run two tests/patterns.
```

List available test components
```shell_session
$ runtests --list 

```

XXX chains

XXX notes on coverage


## Components

### `DEFAULT_TEST_FILES`

[`glob`][glob] pattern(s) used to find test files by default.
```
DEFAULT_TEST_FILES =
    undefined
    | <path>
    | [ <path>, .. ]
```

Default value: `"**/?(*-)test.js"`


### `IGNORE_TEST_FILES`

A list of [`glob`][glob] patterns to ignore while searching for tests. 
```
IGNORE_TEST_FILES =
    undefined
    | [ <path>, .. ]
```

Default value: `['node_modules/**']`


### `Merged(..)`

Implements a _merged_ collection of instances (_members_).
```
Merged({ <key>: <func>, .. })
    -> <member>

Merged(<key>, <func>)
    -> <member>
```

On construction this will assign the input object / `<key>`-`<func>` into the resulting 
`<member>`/instance object.

Each `<member>`/instance created is added to the constructor as a _member_ (i.e. 
added into `.members`)

Provides a set of methods and properties to access/introspect the _merged_ 
(hence the name) attributes of the _members_ (i.e. `.keys(..)`, `.values(..)`, 
`.entries(..)`, `.size`/`.usize` and `.members`).


#### `<merged>.members`

List of _members_ / instances of `Merged` in order of creation.


#### `<merged>.size` / `<merged>.usize`

Number of _members_ including the `"-"` members and not including respectively.

#### `<merged>.add(..)` / `<merged>.remove(..)`

Add / remove a member.
```
<merged>.add(<member>)
    -> <merged>

<merged>.remove(<member>)
    -> <merged>
```

#### `<merged>.clear()`

Remove (_clear_) all the members.


#### `<merged>.keys(..)` / `<merged>.values(..)` / `<merged>.entries(..)`

```
<merged>.keys()
<merged>.keys(<merged>)
    -> <list>

<merged>.values()
<merged>.values(<merged>)
    -> <list>

<merged>.entries()
<merged>.entries(<merged>)
    -> <list>
```

These are similar to `Object.keys(..)` / `Object.values(..)` / `Object.entries(..)` 
but will also if called without arguments return a list of the callers member 
keys/values/entries respectively.

Note that members' attributes can _shadow_ previous member attributes, only one 
value per key will be returned. `<merged>` will warn when adding a member of its 
attributes will _shadow_ already existing members' attributes (see: 
[`<merged>.checkShadowing(..)`](#mergedcheckshadowing) and 
[`<merged>.handleShadowing(..)`](#mergedhandleshadowing));  
Also note that the check for shadowing is performed when the `<member>` is 
created and not when new attributes are added manually.


#### `<merged>.toObject(..)`

Create an object containing all visible member attributes.
```
<merged>.toObject()
    -> <object>
```

#### `<merged>.checkShadowing(..)`

Find all shadowed attributes within `<merged>`.
```
<merged>.checkShadowing()
```

Find all attributes in `<merged>` that will be shadowed by `<member>`
```
<merged>.checkShadowing(<member>)
    -> <list>
```


#### `<merged>.handleShadowing(..)`

Will be called on `<member>` construction when attribute _shadowing_ is detected.
```
`<merged>.handleShadowing(<attr>)`
    -> <merged>
```

By default this will print a warning and continue, but can be overloaded by the 
user to react to _shadowing_ in a different manner.


#### `<member>.filename`

The filename where the `<member>` was defined.


### `Setups(..)` / `Setup(..)` (Merged)

XXX

A _subclass_ or rather _sub-constructor_ of `Merged`.

Note that `Setups` and `Setup` are references to the same object, they exists 
for better readability in cases when we add a single element (`<key>`-`<func>` 
pair) or a bunch of elements (object), for example:
```javascript
// single element...
test.Setup('some-setup', 
    function(){
        // ...
    })

// arbitrary number of elements...
test.Setups({
    'some-other-setup': function(){
        // ...
    },

    // ...
})
```

### `Modifiers(..)` / `Modifier(..)` (Merged)

XXX

A _sub-constructor_ of `Merged`.

### `Tests(..)` / `Test(..)` (Merged)

XXX

A _sub-constructor_ of `Merged`.

### `Cases(..)` / `Case(..)` (Merged)

XXX

A _sub-constructor_ of `Merged`.


### `Assert(..)`

XXX this may still change...


### `run(..)`

Run the test system.
```
run()
run(<tests>)
run(<default-files>)
run(<default_files>, <tests>)
    -> <parse-result>
```

This will:
- parse `process.argv`
- locate and run tests
- report basic stats

`<tests>` format:
```
{
    setups: <stups>,
    modifiers: <modifiers>,
    tests: <tests>,
    cases: <cases>,
}
```


## Advanced components

### `runner(..)`

The default test combinator and runner.


### `parser(..)`

The default [`ig-argv`][ig-argv] parser setup.


## Utilities

### `getCallerFilename()`

Returns the filename of the module where `getCallerFilename()` is called.


## License

[BSD 3-Clause License](./LICENSE)

Copyright (c) 2016-2020, Alex A. Naanou,  
All rights reserved.


<!-- External links -->
[glob]: https://github.com/isaacs/node-glob
[object.js]: https://github.com/flynx/object.js
[ig-argv]: https://github.com/flynx/argv.js


<!-- vim:set ts=4 sw=4 spell : -->