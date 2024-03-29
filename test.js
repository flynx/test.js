#!/usr/bin/env node
/**********************************************************************
* 
* test.js
*
* Repo and docs:
* 	https://github.com/flynx/test.js
*
*
* TODO:
* 	- a mor descriptive assertion fail...
* 		would be nice to:
* 			- know what exactly failed and what was expected automatically
* 			- ...
* 	- list found files...
* 	- flexible test chains with 0 or more modifiers...
* 	- might be a good idea to detect test module type and run only our 
* 		ones...
*
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var npath = require('path')
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

//---------------------------------------------------------------------

var getCallerFilename =
module.getCallerFilename =
function(){
	var f = Error.prepareStackTrace
	try {
		var err = new Error()

		// critical section...
		// NOTE: would subclass Error and overload .prepareStackTrace(..) 
		// 		in it but it does not work, likely to that it is called
		// 		directly on Error and not via the proto chain...
		Error.prepareStackTrace = function(_, stack){ return stack }
		var stack = err.stack
		Error.prepareStackTrace = f

		var cur = stack.shift().getFileName()

		while(stack.length > 0){
			var caller = stack.shift().getFileName()
			if(caller && cur != caller){
				return caller }}
	} catch(e){}
	// cleanup...
	Error.prepareStackTrace !== f
		&& (Error.prepareStackTrace = f)
	return }



//---------------------------------------------------------------------

// compare two arrays by items...
// XXX this is defined in object.js/test.js and here, need to chose one...
var arrayCmp = 
module.arrayCmp =
function(a, b){
	if(a === b){
		return true }
	if(a.length != b.length){
		return false }
	// check elements...
	for(var [i, e] of Object.entries(a)){
		// XXX not sure how strict should we be here???
		//if(typeof(e) !== typeof(b[i])){
		if(e.constructor !== b[i].constructor){
			return false }
		if(e instanceof Array){
			if(arrayCmp(e, b[i])){
				continue }
			return false }
		if(e !== b[i] 
				&& e != b[i]){
			return false } }
	return true }


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
		msg = msg || value
		msg = msg ?
		   	msg.toString()
			: msg + ''
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
			msg +':', 
				'\n  expected:', expected, 
				'\n       got:', value) },

	// output...
	log: function(...args){
		this.verbose
			&& console.log('\t', ...args) },
	warn: function(...args){
		this.verbose
			&& console.warn('\t', ...args) },
	error: function(...args){
		console.error('\t', ...args) },

	__init__: function(path, stats, verbose){
		this.path = path instanceof Array ? 
			path 
			: [path]
		this.stats = stats || {}
		this.verbose = verbose
	},
})



//---------------------------------------------------------------------

// XXX
var mergeIter = function(iter){
	// XXX should this get a function as argument???
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
// Merged is the sum of all its members.
//
// XXX is this generic enough to be moved to ig-types???
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
	// Like .size but does not count the pass-through elements...
	get usize(){
		var k = this.keys()
		return k.length - (k.includes('-') ? 1 : 0) },

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

	//
	//	.checkShadowing()
	//		-> shadows
	//
	//	.checkShadowing(other)
	//		-> shadows
	//
	checkShadowing: function(other){
		var existing = new Set(this.keys())

		other = other || this.members
		return (other instanceof Array ? 
				other 
				: [other])
			.map(function(o){
				return Object.keys(o)
					.filter(function(k){
						return existing.has(k) }) })
   			.flat()	},
	handleShadowing: function(shadowed){
		shadowed.length > 0
			&& console.warn(`  WARNING:`.bold, `shadowing: ${shadowed.join()}`)
		return this },

	create: function(name){
		return object.Constructor(name || this.name, this, {}) },
}, {
	filename: undefined,

	__init__: function(other){
		// parse args...
		if(arguments.length == 2){
			var [name, func] = arguments
			other = {[name]: func} }

		// set .filename on tests...
		var f = getCallerFilename()
		Object.entries(Object.getOwnPropertyDescriptors(other))
			.forEach(function([k, p]){
				typeof(p.value) == 'function'
					&& (p.value.filename = p.value.filename || f) })

		// check for shadowing...
		this.constructor.handleShadowing(
			this.constructor.checkShadowing(other))

		// mix and merge...
		object.mixinFlat(this, other) 
		this.constructor.add(this) }, 
})



//---------------------------------------------------------------------

var TestSet =
module.TestSet =
object.Constructor('TestSet', {
	// XXX make these chainable...
	// 		...at the same time need to keep the API...
	Setup: null,
	setups: null,

	Modifier: null,
	modifiers: null,

	Test: null,
	tests: null,

	Case: null,
	cases: null,

	__assert__: Assert,

	// XXX need to be able to use external assert...
	// 		- from context...
	// 		- from arg...
	// XXX nested assert(..) need to report nestedness correctly...
	// XXX should/can this return a meaningfull result for it to be used
	// 		as a setup/mod???
	// XXX this is very similar to runner(..)...
	__call__: async function(context, chain, stats){
		var assert
		// running nested...
		if(typeof(chain) == 'function'){
			assert = chain
			chain = null 
			stats = stats 
				|| assert.stats }
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
		var {setups, modifiers, tests, cases} = this
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
		// XXX revise nested assert...
		var assert = assert 
			|| this.__assert__('[TEST]', stats, module.VERBOSE)
		var queue = 
			chain_length != 1 ?
				object.deepKeys(tests)
					.filter(function(t, i, l){
						return typeof(tests[t]) == 'function'
							// skip blank tests if we have other tests unless 
							// explicitly specified...
							&& ((t == '-' 
									&& test != t 
									&& l.length > 1) ?
								false
								: (test == '*' 
									|| test == t) ) })
					.map(function(t){
						// modifiers...
						return object.deepKeys(modifiers)
							.filter(function(m){
								return typeof(modifiers[m]) == 'function'
									&& (mod == '*' || mod == m) })
							.map(function(m){
								// setups...
								return object.deepKeys(setups)
									.filter(function(s){
										return typeof(setups[s]) == 'function'
											&& (setup == '*' || setup == s) })
									.map(function(s){
										return [s, m, t] }) }) }) 
					.flat(2)
				: []
			for(var [s, m, t] of queue){
				stats.tests += 1
				var _assert = assert.push(
					[s, m, t]
						// do not print blank pass-through ('-') 
						// components...
						.filter(function(e){ return e != '-' }) )
				await tests[t](_assert, 
					await modifiers[m](_assert, 
						await setups[s](_assert))) }
		// cases...
		assert = assert 
			|| this.__assert__('[CASE]', stats, module.VERBOSE)
		var queue =
			chain_length <= 1 ?
				Object.keys(cases)
					.filter(function(s){
						return typeof(cases[s]) == 'function'
							&& (setup == '*' || setup == s) })
				: []
		for(var c of queue){
			stats.tests += 1
			cases[c](assert.push(c)) }
		// runtime...
		stats.time += Date.now() - started
		return stats },

	__init__: function(func){
		// test collections...
		this.Setup = 
			this.setups = 
				Merged.create('Setups')
		this.Modifier = 
			this.modifiers = 
				Merged.create('Modifiers')
					// default blank pass-through...
					// NOTE: we need at least one modifier and at least 
					// 		one test for the system to run....
					.add({ '-': function(_, s){ return s }})
		this.Test = 
			this.tests = 
				Merged.create('Tests')
					// default blank pass-through...
					// NOTE: we need at least one modifier and at least 
					// 		one test for the system to run....
					.add({ '-': function(_, s){ return s }})
		this.Case = 
			this.cases = 
				Merged.create('Cases') 
		// init...
		// XXX should this also get assert???
		func
			&& func.call(this) },
})


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// XXX rename to runner...
module.BASE_TEST_SET = new TestSet()

module.Setup =
module.Setups = 
	module.BASE_TEST_SET.Setup

module.Modifier =
module.Modifiers = 
	module.BASE_TEST_SET.Modifier

module.Test =
module.Tests = 
	module.BASE_TEST_SET.Test

module.Case =
module.Cases = 
	module.BASE_TEST_SET.Case


// XXX this is just a proxy to Cases(..), do we need it?
module.merge =
	module.BASE_TEST_SET.merge



//---------------------------------------------------------------------
// Test runner/combinator...
//
// 	runner(spec)
// 	runner(spec, '*')
// 		-> promise(stats)
//
// 	runner(spec, 'case')
// 	runner(spec, 'setup:test')
// 	runner(spec, 'setup:mod:test')
// 		-> promise(stats)
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
//* XXX do we need a root runner???
//		...if not then need to cleanup run(..) to use TestSet / BASE_TEST_SET...
var runner = 
module.runner =
async function(spec, chain, stats){
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

	// setup stats...
	stats = stats || {}
	Object.assign(stats, {
		tests: stats.tests || 0,
		assertions: stats.assertions || 0,
		failures: stats.failures || 0,
		time: stats.time || 0,
	})

	var started = Date.now()
	// tests...
	var queue = 
		chain_length != 1 ?
			object.deepKeys(tests)
				.filter(function(t, i, l){
					return typeof(tests[t]) == 'function'
						// skip blank tests if we have other tests unless 
						// explicitly specified...
						&& ((t == '-' 
								&& test != t 
								&& l.length > 1) ?
							false
							: (test == '*' 
								|| test == t) ) })
				.map(function(t){
					// modifiers...
					return object.deepKeys(modifiers)
						.filter(function(m){
							return typeof(modifiers[m]) == 'function'
								&& (mod == '*' || mod == m) })
						.map(function(m){
							// setups...
							return object.deepKeys(setups)
								.filter(function(s){
									return typeof(setups[s]) == 'function'
										&& (setup == '*' || setup == s) })
								.map(function(s){
									return [s, m, t] }) }) })
				.flat(2)
			: []
	// NOTE: we are not running these via .map(..) to keep things in 
	// 		sequence...
	var assert = Assert('[TEST]', stats, module.VERBOSE)
	for(var [s, m, t] of queue){
		// run the test...
		stats.tests += 1
		var _assert = assert.push(
			[s, m, t]
				// do not print blank pass-through ('-') 
				// components...
				.filter(function(e){ 
					return e != '-' }) )
		await tests[t](
			_assert, 
			await modifiers[m](
				_assert, 
				await setups[s](_assert))) }

	// cases...
	var queue = 
		chain_length <= 1 ?
			Object.keys(cases)
				.filter(function(s){
					return typeof(cases[s]) == 'function'
						&& (setup == '*' 
							|| setup == s) })
			: []
	var assert = Assert('[CASE]', stats, module.VERBOSE)
	for(var c of queue){
		stats.tests += 1
		await cases[c](assert.push(c)) }

	// runtime...
	stats.time += Date.now() - started
	return stats }
//*/



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
	//
	// NOTE: this uses .helpColumnOffset to align origins...
	default_files: undefined,

	// XXX if we do the printing in .stop(..) this will see all the modules...
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

			// load the queued modules...
			this.loadModule()

			var offset = (this.helpColumnOffset || 3) * 8
			// get key value...
			var keys = function(s){
				return (object.parentOf(Merged, s) ?
						s.entries()
						: Object.entries(s))
					.map(function([k, v]){
						var o = offset - k.length 
						var s = [
							k, 
							v.filename ?
								' '.repeat(o > 0 ? o : offset) 
									+ `- ${ npath.relative(process.cwd(), v.filename) }`
								: '' ]
						return o > 0 ?
							s.join('')
							: s })
					.flat() }
			// XXX should this account for pass-through elements...
			var len = function(s){
				return (object.parentOf(Merged, s) ? 
					s.size
					: Object.keys(s).length) }
			var a, b, c, d
			console.log(
				object.text`
				Tests run by %s can be of the following forms:

					<case>
					<setup>:<test>
					<setup>:<modifier>:<test>

				Setups (${ (a = len(this.setups)) +'' }):
					${ keys(this.setups).join('\n\
					') }

				Modifiers (${ ((b = len(this.modifiers)) - 1) +'' }):
					${ keys(this.modifiers)
						.filter(function(e){ return e != '-' })
						.join('\n\
					') }

				Tests (${ (c = len(this.tests) - 1) +''}):
					${ keys(this.tests)
						.filter(function(e){ return e != '-' })
						.join('\n\
					') }

				Standalone test cases (${ (d = len(this.cases)) +'' }):
					${ keys(this.cases).join('\n\
					') }

				Total number of test chains: ${ ((a * b * (c || 1)) + d) +'' }
				`, this.scriptName)
			process.exit() }},


	// list found modules...
	//
	// XXX use tab size...
	'-list-found': {
		doc: 'like -list but print found test modules and exit',
		arg: 'PATH',
		handler: function(args, key, path){
			path = path || this.default_files
			// load path or the defaults if nothing loaded...
			path
				&& (path != this.default_files
					|| this.test_modules == null)
				&& this.handle('-f', [], key, path)
			var modules = Object.keys(this.test_modules || {})
			console.log([
					`Found modules (${ modules.length+'' }):`,
					...modules
				// XXX use tab size...
				].join('\n    '))
			process.exit() }},


	// queue files/patterns...
	// XXX should this energetically load modules (current) or queue 
	// 		them for later loading (on .then(..))...
	// 		...should this be an option???
	test_modules: undefined,
	queueModule: function(path){
		;(this.test_modules = this.test_modules || {})[path] = undefined
		return this },
	loadModule: function(path){
		var that = this
		path = path || Object.keys(this.test_modules || {})
		path = path instanceof Array ?
			path
			: [path]
		path
			// do not reload modules...
			.filter(function(path){
				return !(that.test_modules || {})[path] })
			.forEach(function(path){
				console.log('Loading module:', path)
				// XXX should we handle the load error here???
				;(that.test_modules = that.test_modules || {})[path] = 
					require(process.cwd() +'/'+ path.slice(0, -3)) })
		return this },

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
							//that.loadModule(path) }) }) }},
							that.queueModule(path) }) }) }},


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
// load the modules...
.then(function(){
	this.loadModule() })



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

	// patch require.cache...
	// NOTE: this will make all the client scripts see the global module 
	// 		instead of local stuff...
	if(typeof(__filename) != 'undefined'
			&& __filename == (require.main || {}).filename){
		// XXX is guessing this the correct way to do this???
		// 		...should we use glog.sync(process.cwd()+'/**/ig-test/test.js') instead???
		var local = npath.join(process.cwd(), 'node_modules', 'ig-test', 'test.js')
		require.cache[local] = require.cache[require.main.filename] }

	var stats = {}
	var tests = tests 
		|| {
			setups: module.Setups,
			modifiers: module.Modifiers,
			tests: module.Tests,
			cases: module.Cases,
		}
	var p = Object.assign(
		Object.create(parser), 
		tests,
		{
			default_files: default_files,
		})

	return p
		// XXX should this be generic???
		.then(async function(chains){
			// run the tests...
			if(chains.length > 0){
				for(var chain of chains){
					await runner(tests, chain, stats) }
					//await module.BASE_TEST_SET(tests, chain, stats) }
			} else {
				await runner(tests, '*', stats) }
				//await module.BASE_TEST_SET(tests, '*', stats) }

			// XXX BUG for some reason we can get here BEFORE all the 
			// 		tests are finished -- forgot to await'ing something???

			// print stats...
			console.log(
				'Tests run:', stats.tests, 
				'  Assertions:', stats.assertions, 
				'  Failures:', stats.failures,
				`  (${stats.time}ms)`.bold.black) 

			// report error status to the OS...
			process.exit(stats.failures) })
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
