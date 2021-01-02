module.exports = {
    context: __dirname,
    plugins: [
        new webpack.ProvidePlugin({
            'cannon': 'cannon'
        })
    ]
}