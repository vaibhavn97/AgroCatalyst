const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

// Configuration of App
const PORT = 5500;
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({
    secret : "This is Auth",
    resave : false,
    saveUninitialized : false
}))
app.use(passport.initialize());
app.use(passport.session());


// Configuring DataBase
mongoose.connect('mongodb://127.0.0.1:27017/catalyst', { useNewUrlParser : true});
const UserSchema = new mongoose.Schema({
    username : String,
    firstname: String,
    lastname: String,
    location: String,
    password : String,
    phonenumber: Number,
    harvest: Array,
    isStaff: Boolean
})
UserSchema.plugin(passportLocalMongoose);

const UserModel = mongoose.model('users', UserSchema);
passport.use(UserModel.createStrategy());
passport.serializeUser(UserModel.serializeUser());
passport.deserializeUser(UserModel.deserializeUser());


const locationSchema = new mongoose.Schema({
    _id : Object,
    name: String,
    crops: Array
})

const locationModel = mongoose.model("locations1", locationSchema);


app.get("/", (req, res)=>{
    res.render("index", {title: "title", crop:undefined})
})





// Authenctication Part 
// Login Get and Post
app.get('/login', (req, res)=>{
    let message = null;
    res.render('login', {message : message});
});


app.post('/login', (req, res)=>{
    const user = new UserModel({
        username : req.body.username,
        password : req.body.password
    })
    req.login(user, (err)=>{
        if(err){
            console.log(err);
            res.redirect('/login');
        }
        else{
            passport.authenticate('local')(req, res, ()=>{
                if(req.user.isStaff){
                    return res.redirect('/profile');
                }
                res.redirect('/crops')
            })
        }
    })
})

// Registor Get and Post
app.get('/register', (req, res)=>{
    res.render('login');
})

app.post('/register', (req, res)=>{
    UserModel.register({username : req.body.username, firstname: req.body.firstname, lastname: req.body.lastname, location: req.body.location, phonenumber: req.body.phonenumber}, req.body.password, (err, user)=>{
        if(err){
            console.log(err);
            res.redirect('/register')
        }
        else{
            passport.authenticate('local')(req, res, ()=>{
                res.redirect('/login');
            })
        }
    })
});

app.get('/logout', (req, res)=>{
    req.logout((err)=>{
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/');
        }
    });

})
// Profile 
app.get('/profile', (req, res)=>{
    if(req.isAuthenticated() && req.user.isStaff){
        res.render('profile');
    }
    else{
        res.redirect('/crops');
    }
})


// Crops Handling
app.get('/crops', (req, res)=>{
    if(req.isAuthenticated()){
        locationModel.findOne({name: req.user.location}, (err, result)=>{
            if(err){
                console.log(err);
                res.redirect('/login');
            }
            else{
                let crops = result.crops;
                res.render("cropsInfo", {crops: crops});
            }
        })
    }
    else{
        res.redirect('/login');
    }
});

app.get('/crops/add/:cropName', (req, res)=>{
    if(req.isAuthenticated()){
        locationModel.findOne({name: req.user.location}, (err, result)=>{
            if(err){
                console.log(err);
                res.redirect('/login');
            }
            else{
                for (let index = 0; index < req.user.harvest.length; index++) {
                    if(req.user.harvest[index].cropName == req.params.cropName){
                        return res.redirect("/crop/"+req.params.cropName);
                    }
                    else{
                        req.user.harvest.push({
                            'cropName' : req.params.cropName,
                            'harDate' : new Date()
                        })
                        req.user.save()
                        return res.redirect('/crop/'+req.params.cropName);
                    }
                }
            }
        })
    }
    else{
        res.redirect('/login');
    }
});



app.get('/crop/:cropName', (req, res)=>{
    if(req.isAuthenticated()){
        locationModel.findOne({name: req.user.location}, (err, result)=>{
            if(err){
                console.log(err);
                res.redirect('/login');
            }
            else{
                for (let index = 0; index < req.user.harvest.length; index++) {
                    if(req.user.harvest[index].cropName == req.params.cropName){
                        for (let i = 0; i < result.crops.length; i++) {
                            if(result.crops[i].name == req.params.cropName){
                                return res.render('roadmap', {sch: result.crops[i].schedule});
                            }
                        }
                    }
                }
                return res.send("Crops Not Harvested");
                
            }
        })
    }
    else{
        res.redirect('/login');
    }
})




app.listen(PORT, ()=>{
    console.log(` The Server is running at port ${PORT}`);
})

