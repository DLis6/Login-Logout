const express = require('express');
const app = express();
app.use(express.urlencoded());
var mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/login_', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", function(e) { console.error(e); });
var bcrypt = require('bcrypt');
var cookieSession = require('cookie-session')
app.use(cookieSession({
    secret: "login",
    maxAge: 1 * 60 * 60 * 1000 // 01 hour
}))

var schema = mongoose.Schema({
    name: { type: String, default: "Anónimo" },
    email: { type: String, default: "Anónimo" },
    password: { type: String, default: "Anónimo" },
})
schema.statics.authenticate = async(email, password) => {
    // buscamos el usuario utilizando el email
    const user = await mongoose.model("Formulario").findOne({ email: email });
    if (user) {
        // si existe comparamos la contraseña
        const match = await bcrypt.compare(password, user.password);
        return match ? user : null;
    }
    return null;
};

var Formulario = mongoose.model("Formulario", schema);



var crearHTML = function(info) {
    var chtml = '<table class="table"><thead><tr><th>Nombre</th><th>Correo</th></tr></thead><tbody>';
    info.forEach(elem => {
        chtml += '<tr>'
        chtml += '<td>' + elem.name + '</td>'
        chtml += '<td>' + elem.email + '</td></tr>'
    });
    chtml += '</tbody></table>';
    return chtml;
}

app.get('/', async(req, res) => { //Muestra lista de usuarios

    var info = await Formulario.find({}).exec();
    var html = crearHTML(info)

    res.send(html + '<br><a href="/logout">LogOut</a><br>');
});

app.get('/register', (req, res) => { // Muestra el formulario para registarse
    res.send('<form action="/register" method="post"><label for="name"><h2> Nombre</h2><input type="text" id="name" name="name"><h2>Email</h2><input type="text" id="email" name="email"><h2> Contraseña</h2><input type="password" id="password" name="password"><button type="submit">Registrarse</button></form>');
});

app.post('/register', async(req, res) => { //Crear un usuario en mongoDB

    const hash = await bcrypt.hash(req.body.password, 10);

    await Formulario.create({ name: req.body.name, email: req.body.email, password: hash }, function(err) {
        if (err) return console.error(err);
    });
    res.redirect('/login');
})

app.get('/login', (req, res) => { // Muestra el formulario para autenticarse
    res.send('<form action="/login" method="post"><label for="name"><h2>Email</h2><input type="text" id="email" name="email"><h2> Contraseña</h2><input type="password" id="password" name="password"><br><a href="/register">Registrar</a><button type="submit">Ingresar</button></form>');
});

app.post('/login', async(req, res) => { //Autentica el usuario


    try {
        const user = await Formulario.authenticate(req.body.email, req.body.password);
        if (user) {
            req.session.userId = user._id; // acá guardamos el id en la sesión
            return res.redirect("/");
        } else {
            res.redirect("/login");
        }
    } catch (e) { console.log(e) }

    //res.redirect('/');
});

app.get('/logout', (req, res) => { // Muestra el formulario para autenticarse

    req.session.userId = null;
    res.redirect('/login');
});

app.listen(3000, () => console.log('Listening on port 3000!'));