const run = require('./run').run
const migrate = require('./migrate').migrate
const package = require('./package.json')

const option = process.argv[2]

const help = () => {
    console.log('Welcome to Mini-Mango')
    console.log('version:', package.version, '\n')
    console.log('Commands:')
    console.log('\tno argument - defaults to "run" command, see below')
    console.log('\trun - starts the server with dynamic API')
    console.log('\tmigrate - creates collections and adds or updates schemas')
    console.log('\tany other - shows this help message')
}

if (option) {
    switch(option) {
        case 'run': run(); break;
        case 'migrate': migrate(); break;
        default: help(); break;
    }
} else {
    run()
}