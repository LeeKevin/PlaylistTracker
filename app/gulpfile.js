var elixir = require('laravel-elixir');

elixir(function (mix) {

    var style_file = './public/css/app.css';
    var script_file = './public/js/app.js';

    mix.sass('main.scss', style_file)
        .scripts([
            './node_modules/jquery/dist/jquery.js',
            '**/*.js'
        ], script_file)
        .version([style_file, script_file])
        .copy('./node_modules/font-awesome/fonts', './public/build/fonts');

});
