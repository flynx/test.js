#!/usr/bin/env node
/**********************************************************************
* 
* test.js
*
* Repo and docs:
* 	https://github.com/flynx/test.js
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var colors = require('colors')
var glob = require('glob')

var object = require('ig-object')
var argv = require('ig-argv')



//---------------------------------------------------------------------

//
//	DEFAULT_TEST_FILES =
// 		undefined
// 		| <path>
// 		| [ <path>, .. ]
//
module.DEFAULT_TEST_FILES = '**/?(*-)test.js'


//
//	IGNORE_TEST_FILES =
//		undefined
//		| [ <path>, .. ]
//
module.IGNORE_TEST_FILES = ['node_modules/**']


//
//	VERBOSE = <bool>
//
//
// NOTE: to test in verbose mode do:
// 			$ VERBOSE=1 npm test
// 		or
// 			$ VERBOSE=1 node test.js
// 		or set this manually after require('./test') but before calling 
// 		the runner(..) or run(..)
// NOTE: this may change in the future...
module.VERBOSE = process ?
	process.env.VERBOSE
	: false



//---------------------------------------------------------------------

// compare two arrays by items...
// XXX this is defined in object.js/test.js and here, need to chose one...
var arrayCmp = function(a, b){
	var ka = Object.keys(a)
	var kb = Object.keys(a)
	return a === b
		|| (a.length == b.length
			&& ka
				// keep only non matching stuff...
				.filter(function(k){
					return a[k] !== b[k] 
						&& a[k] != a[k] })
				.length == 0) }


// Assert constructor...
//
//	Create an assert callable...
//	Assert()
//	Assert(path[, stats[, verbose]])
//		-> assert
//
//	Create an assert with extended path...
//	assert.push(path)
//		-> assert
//
//	Create an assert with shortened path...
//	assert.pop(path)
//		-> assert
//
//
// Assertions...
//
//	value is truthy...
//	assert(value, msg, ..)
//		-> value
//
//	Assert truth and catch exceptions...
//	assert.assert(msg, test())
//		-> value
//
//	Assert if test does not throw...
//	assert.error(msg, test())
//		-> error
//
//
// XXX this should be optional...
var Assert = 
module.Assert =
object.Constructor('Assert', {
	stats: null,

	__verbose: null,
	get verbose(){
		return this.__verbose == null ? 
			module.VERBOSE 
			: this.__verbose },
	set verbose(value){
		value == null ?
			(delete this.__verbose)
			: (this.__verbose = value) },

	// path API...
	__str_path: null,
	get strPath(){
		return (this.__str_path = 
			this.__str_path 
				|| (this.path || []).join(':')) },
	path: null,
	push: function(path){
		return this.constructor(
			[
				...(this.path || []), 
				...(path instanceof Array ? 
					path 
					: [path])
			], 
			this.stats,
			this.verbose) },
	pop: function(){
		return this.constructor(
			(this.path || []).slice(0, -1), 
			this.stats,
			this.verbose) },

	// assertion API...
	__call__: function(_, value, msg, ...args){
		msg = msg || ''
		// stats...
		var stats = this.stats
		stats.assertions = (stats.assertions || 0) + 1
		!value
			&& (stats.failures = (stats.failures || 0) + 1)

		// assertions...
		this.verbose
			&& console.log(this.strPath +': '+ msg.bold, ...args)
		console.assert(value, this.strPath.bold +': '+ msg.bold.yellow, ...args)

		return value },
	istrue: function(msg, test){
		try {
			return this(test.call(this), msg)

		} catch(err){
			this(false, msg)
			return err } },
	error: function(msg, test){
		try {
			test.call(this)
			return this(false, msg)

		} catch(err){
			this(true, msg)
			return err } },
	// XXX 
	array: function(value, expected, msg){
		msg = msg || ''
		return this(arrayCmp(value, expected), 
			msg +':', 'expected:', expected, 'got:', value) },

	__init__: function(path, stats, verbose){
		this.path = path instanceof Array ? 
			path 
			: [path]
		this.stats = stats || {}
		this.verbose = verbose
	},
})



//---------------------------------------------------------------------

var mergeIter = function(iter){
	return function(c){
		c = c || this
		return (c.members || [])
			.map(function(e){ return Object[iter](e) })
			.flat() } }




// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

//
// 	Merged(name, func)
// 		-> merged
//
// 	Merged({name: func, ..})
// 		-> merged
//
//
var Merged = 
module.Merged =
object.Constructor('Merged', {
	__members: undefined,
	get members(){
		return this.__members == null ?
			(this.__members = []) 
			: this.__members },
	set members(value){
		this.__members = value },

	// NOTE: this is the number of member elements and not the number 
	// 		of members...
	// 		for the number of members use:
	// 			<constructor>.members.length
	// NOTE: we are using .size and not .length here because .length is 
	// 		used to indicate the number of arguments to a callable/function
	// 		in JS... 
	get size(){
		return this.keys().length },

	add: function(member){
		this.members.push(member)
		return this },
	remove: function(member){
		var m = this.members
		var i = m.indexOf(member)
		i >= 0
			&& m.splice(i, 1)
		return this },
	clear: function(){
		delete this.__members
		return this },

	keys: mergeIter('keys'),
	values: mergeIter('values'),
	entries: mergeIter('entries'),

	toObject: function(){
		return Object.fromEntries(this.entries()) },
}, {
	__init__: function(other){
		if(arguments.length == 2){
			var [name, func] = arguments
			other = {[name]: func}
		}
		object.mixinFlat(this, other) 
		this.constructor.add(this) }, 
})


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var Setups = 
module.Setup =
module.Setups =
object.Constructor('Setups', Merged, {})


var Modifiers = 
module.Modifier =
module.Modifiers =
object.Constructor('Modifiers', Merged, {})
	// default blank pass-through...
	// NOTE: we need at least one modifier and at least one test for the 
	// 		system to run....
	.add({ '-': function(_, s){ return s }})


var Tests = 
module.Test =
module.Tests =
object.Constructor('Tests', Merged, {})
	// default blank pass-through...
	// NOTE: we need at least one modifier and at least one test for the 
	// 		system to run....
	.add({ '-': function(_, s){ return s }})


var Cases = 
module.Case =
module.Cases =
object.Constructor('Cases', Merged, {})



//---------------------------------------------------------------------
// Test runner/combinator...
//
// 	runner(spec)
// 	runner(spec, '*')
// 		-> stats
//
// 	runner(spec, 'case')
// 	runner(spec, 'setup:test')
// 	runner(spec, 'setup:mod:test')
// 		-> stats
//
//
// This will run 
// 		test(modifier(setup)) 
// 			for each test in spec.tests
// 			for each modifier in spec.modifiers
// 			for each setup in spec.setups
// 		case() 
// 			for each case in spec.cases
//
//
// NOTE: chaining more than one modifier is not yet supported (XXX)
//
// XXX chain N modifiers...
// XXX make Assert optional...
// XXX is this a good name???
var runner = 
module.runner =
function(spec, chain, stats){
	// parse chain...
	chain = (chain == '*' || chain == null) ?
		[]
		: chain
	chain = chain instanceof Array ? 
		chain 
		: chain.split(/:/)
	var chain_length = chain.length
	var setup = chain.shift() || '*'
	var test = chain.pop() || '*'
	var mod = chain.pop() || '*'
	mod = chain_length == 2 ? 
		'as-is' 
		: mod

	// get the tests...
	var {setups, modifiers, tests, cases} = spec
	;[setups, modifiers, tests, cases] = 
		[setups, modifiers, tests, cases]
			.map(function(e){
				return object.parentOf(Merged, e) ?
					e.toObject()
					: (e || {}) })

	// stats...
	stats = stats || {}
	Object.assign(stats, {
		tests: stats.tests || 0,
		assertions: stats.assertions || 0,
		failures: stats.failures || 0,
		time: stats.time || 0,
	})

	var started = Date.now()
	// tests...
	var assert = Assert('[TEST]', stats, module.VERBOSE)
	chain_length != 1
		&& object.deepKeys(tests)
			.filter(function(t, i, l){
				return (
					// skip blank tests if we have other tests unless 
					// explicitly specified...
					(t == '-' 
						&& test != t 
						&& l.length > 1) ?
					false
					: (test == '*' 
						|| test == t) ) })
			.forEach(function(t){
				// modifiers...
				object.deepKeys(modifiers)
					.filter(function(m){
						return mod == '*' || mod == m })
					.forEach(function(m){
						// setups...
						object.deepKeys(setups)
							.filter(function(s){
								return setup == '*' || setup == s })
							.forEach(function(s){
								if(typeof(setups[s]) != 'function'){
									return }
								// run the test...
								stats.tests += 1
								var _assert = assert.push(
									[s, m, t]
										// do not print blank pass-through ('-') 
										// components...
										.filter(function(e){ return e != '-' }) )
								tests[t](_assert, 
									modifiers[m](_assert, 
										setups[s](_assert))) }) }) }) 
	// cases...
	var assert = Assert('[CASE]', stats, module.VERBOSE)
	chain_length <= 1
		&& Object.keys(cases)
			.filter(function(s){
				return setup == '*' || setup == s })
			.forEach(function(c){
				stats.tests += 1
				cases[c]( assert.push(c) ) }) 
	// runtime...
	stats.time += Date.now() - started
	return stats }



//---------------------------------------------------------------------
// CLI...
//
var parser = 
module.parser =
argv.Parser({
	// doc...
	usage: `$SCRIPTNAME [OPTIONS] [CHAIN] ...`,
	doc: object.text`Run tests.

		Tests run by $SCRIPTNAME can be specified in one of the 
		following formats:

				<case>
				<setup>:<test>
				<setup>:<modifier>:<test>

		Each of the items in the test spec can be a "*" indicating
		that all relevant items should be used, for example:

				$ ./$SCRIPTNAME basic:*:*

		Here $SCRIPTNAME is instructed to run all tests and modifiers
		only on the basic setup.

		Zero or more sets of tests can be specified.

		When no tests specified $SCRIPTNAME will run all tests.
		`,
	examples: [
		['$ ./$SCRIPTNAME', 
			'run all tests.'.gray],
		['$ ./$SCRIPTNAME basic:*:*', 
			'run all tests and modifiers on "basic" setup.'.gray,
			'(see $SCRIPTNAME -l for more info)'.gray],
		['$ ./$SCRIPTNAME -v example', 
			'run "example" test in verbose mode.'.gray],
		['$ ./$SCRIPTNAME native:gen3:methods init:gen3:methods', 
			'run two tests/patterns.'.gray],
		//['$ export VERBOSE=1 && ./$SCRIPTNAME', 
		//	'set verbose mode globally and run tests.'.gray],
	],


	// list tests...
	default_files: undefined,

	'-l': '-list',
	'-list': {
		doc: ['list available tests;',
			'note that if passing files via -f explicitly they',
			'must precede the -l/-list flag;',
			'this has the same defaults as -f'],
		arg: 'PATH',
		handler: function(args, key, path){
			path = path || this.default_files
			// load path or the defaults if nothing loaded...
			path
				&& (path != this.default_files
					|| this.test_modules == null)
				&& this.handle('-f', [], key, path)
			// get key value...
			var keys = function(s){
				return object.parentOf(Merged, s) ?
					s.keys()
					: Object.keys(s)}
			console.log(
				object.text`Tests run by %s can be of the following forms:

					<case>
					<setup>:<test>
					<setup>:<modifier>:<test>

				Setups:
					${ keys(this.setups).join('\n\
					') }

				Modifiers:
					${ keys(this.modifiers)
						.filter(function(e){ return e != '-' })
						.join('\n\
					') }

				Tests:
					${ keys(this.tests)
						.filter(function(e){ return e != '-' })
						.join('\n\
					') }

				Standalone test cases:
					${ keys(this.cases).join('\n\
					') }
				`, this.scriptName)
			process.exit() }},


	// add files/patterns...
	test_modules: undefined,

	// XXX revise error handling...
	'-f': '-test-file',
	'-test-file': {
		doc: ['test script or filename pattern, supports glob;',
			'this flag can be given multiple times for',
			'multiple paths/patterns'],
		arg: 'PATH',
		default: function(){
			return this.default_files },
		handler: function(args, key, path){
			var that = this
			this.test_modules = this.test_modules || {}

			;(path instanceof Array ?
					path
					: [path])
				.forEach(function(path){
					;(path.includes('*') ?
							// search...
							glob.sync(path, {
								ignore: this.ignore_files 
									|| module.IGNORE_TEST_FILES
									|| [], })
							: [path])
						// load the modules...
						.forEach(function(path){
							// only load .js files...
							if(!/.*\.js$/.test(path)){
								throw argv.ParserError(
									`${key}: only support .js modules, got: "${path}"`) }
							console.log('found module:', path)
							// XXX should we handle the load error here???
							that.test_modules[path] = 
								require(process.cwd() +'/'+ path.slice(0, -3)) }) }) }},


	// ignore paths...
	ignore_files: undefined,

	'-i': '-ignore',
	'-ignore': {
		doc: 'path/pattern to ignore in test file search',
		arg: 'PATH | ignore_files',
		collect: 'list',
		default: function(){
			return this.ignore_files 
				|| module.IGNORE_TEST_FILES 
				|| [] } },


	'-verbose': {
		doc: 'verbose mode',
		env: 'VERBOSE',
		handler: function(){
			module.VERBOSE = true }},


	// hide stuff we do not need...
	'-quiet': undefined,
	'-': undefined,

	// XXX might be a good idea to check chain syntax here...
	'@*': undefined,
})



//---------------------------------------------------------------------
// Base runner...
//
// 	run()
// 	run(tests)
// 	run(default_files)
// 	run(default_files, tests)
// 		-> parse-result
//
//
// tests format:
// 	{
// 		setups: <setup-object>,
//
// 		modifiers: <modifier-object>,
//
// 		tests: <tests-object>,
//
// 		cases: <cases-object>,
//
// 		...
// 	}
//
var run =
module.run =
function(default_files, tests){
	// parse args -- run(tests)...
	if(!(default_files instanceof Array 
			|| typeof(default_files) == typeof('str'))){
		tests = default_files
		default_files = undefined }
	
	var stats = {}
	var tests = tests || {
		setups: Setups,
		modifiers: Modifiers,
		tests: Tests,
		cases: Cases,
	}
	var p = Object.assign(
		Object.create(parser), 
		tests,
		{
			default_files: default_files,
		})

	return p
		// XXX should this be generic???
		.then(function(chains){
			// run the tests...
			chains.length > 0 ?
				chains
					.forEach(function(chain){
						runner(tests, chain, stats) })
				: runner(tests, '*', stats)

			// print stats...
			console.log(
				'Tests run:', stats.tests, 
				'  Assertions:', stats.assertions, 
				'  Failures:', stats.failures,
				`  (${stats.time}ms)`.bold.black) 

			// report error status to the OS...
			process.exit(stats.failures)
		})
		.call() }



//---------------------------------------------------------------------
typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	// NOTE: we are delaying code execution here to give the module a 
	// 		chance to complete loading and the clients to use its 
	// 		content. Otherwise the clients will get a partially formed 
	// 		module...
	// 		This is needed only here, client code can safely and simply
	// 		call run(..)
	&& setTimeout(run.bind(null, module.DEFAULT_TEST_FILES), 0)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
