# test.js
experimental test runner....

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