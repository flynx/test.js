#!/usr/bin/env node
/**********************************************************************
* 
* test.js
*
* Repo and docs:
* 	https://github.com/flynx/test.js
*
*
* XXX need an interface, preferably zero-config with command-line...
* 		something like:
* 			$ ig-test ./test.js base:*:*		- test script...
* 		or:
* 			$ ig-test base:*:*					- locate tests...
* XXX need a way to reuse the thing...
*
*
*
*
***********************************************/ /* c8 ignore next 2 */
((typeof define)[0]=='u'?function(f){module.exports=f(require)}:define)
(function(require){ var module={} // make module AMD/node compatible...
/*********************************************************************/

var colors = require('colors')

var object = require('ig-object')
var argv = require('ig-argv')



//---------------------------------------------------------------------

// NOTE: to test in verbose mode do:
// 			$ export VERBOSE=1 && npm test
// 		or
// 			$ export VERBOSE=1 && node test.js
// 		or set this manually after require('./test') but before running 
// 		the runner(..)
// NOTE: this may change in the future...
module.VERBOSE = process ?
	process.env.VERBOSE
	: false



//---------------------------------------------------------------------
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
// XXX is this the right name for this??
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
	get length(){
		return this.members.keys().length },

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
	values: mergeIter('keys'),
	entries: mergeIter('entries'),

	toObject: function(){
		return Object.fromEntries(this.entries()) },
	
}, {
	__init__: function(other){
		if(arguments.length == 2){
			var [name, func] = arguments
			other = {[name]: func}
		}
		Object.assign(this, other) 
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

var Tests = 
module.Test =
module.Tests =
object.Constructor('Tests', Merged, {})

var Cases = 
module.Case =
module.Cases =
object.Constructor('Cases', Merged, {})



//---------------------------------------------------------------------

// Test runner...
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
				return e instanceof Merged ?
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
		&& Object.keys(tests)
			.filter(function(t){
				return test == '*' || test == t })
			.forEach(function(t){
				// modifiers...
				Object.keys(modifiers)
					.filter(function(m){
						return mod == '*' || mod == m })
					.forEach(function(m){
						// setups...
						Object.keys(setups)
							.filter(function(s){
								return setup == '*' || setup == s })
							.forEach(function(s){
								if(typeof(setups[s]) != 'function'){
									return }
								// run the test...
								stats.tests += 1
								var _assert = assert.push([s, m, t])
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

// XXX



//---------------------------------------------------------------------
typeof(__filename) != 'undefined'
	&& __filename == (require.main || {}).filename
	// NOTE: we are delaying code execution here to give the module a 
	// 		chance to complete loading and the clients to use its 
	// 		content. Otherwise the clients will get a partially formed 
	// 		module...
	&& setTimeout(function(){

		// XXX get test modules...

		require('./test-test')

		console.log(Setups.keys())


		var stats = runner({
			setups: Setups,
			modifiers: Modifiers,
			tests: Tests,
			cases: Cases,
		})

		console.log('>>>>>>>>>', stats)


	}, 0)




/**********************************************************************
* vim:set ts=4 sw=4 :                               */ return module })
