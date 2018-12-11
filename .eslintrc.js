module.exports = {
    'env': {
        'node': true,
        'mocha': true,
        'es6': true,
    },
    'plugins': [
      'security'
    ],
    'extends': ['airbnb-base', 'plugin:security/recommended'],
    'rules': {
        "security/detect-non-literal-fs-filename": "off",
        'no-restricted-syntax': [
            2,
            'BreakStatement',
            'DebuggerStatement',
            'LabeledStatement',
            'WithStatement',
        ]
    }
};
