/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */



var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');
const { env } = require('process');
var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;


var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();
// mongoose.connect(process.env.DB);
function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}


  

router.post('/signup', async function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        let finduser = await User.find({'username' : { '$regex' : user.username, '$options' : 'i'}})
        console.log(finduser);
        
        if (finduser.length !== 0) {

            res.json({success: false, msg: 'A user with that username already exists.'})

        } else {
            user.save(function(err){
            
                if (err) {
                    if (err.code == 11000)
                        return res.json({ success: false, message: 'A user with that username already exists.'});
                    else
                        return res.json(err);
                }
    
                res.json({success: true, msg: 'Successfully created new user.'})
            });

        }

    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});


router.route('/movies')
.get(authJwtController.isAuthenticated, async(req, res) => {
    let movies;
    let includeReview = req.query.reviews;
    console.log("review", includeReview);
    let reviews;
    var o = getJSONObjectForMovieRequirement(req);
    if (includeReview) {
        movies = await Movie.aggregate([
            {
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'movieId',
                    as: 'reviews'
                }
            },
            {
                $addFields: {
                    average_rating: { $avg: '$reviews.rating'}
                }
            }

        ])
        o.status = 200;
        o.message = "GET movies";
        o.movies = movies;
        o.headers = req.headers;
        o.query = req.query;
        o.key = env.UNIQUE_KEY;
        res.json(o);
    }
    else {
        
        if (req.body.title){
            movies = await Movie.find({'title' : { '$regex' : req.body.title, '$options' : 'i'}})
            console.log(movies);
            if (movies.length > 0) {
                o.status = 200;
                o.message = "GET movies";
                o.movies = movies;
                o.headers = req.headers;
                o.query = req.query;
                o.key = env.UNIQUE_KEY;
                res.json(o);

            }
            else {
                
                o.status = 401;
                o.message = "can't find movie title";
                
                o.movies = movies;
                o.headers = req.headers;
                o.query = req.query;
                o.key = env.UNIQUE_KEY;
                res.status(401).json(o);
            }
    
        }
        else {
            movies = await Movie.find();
            o.status = 200;
            o.message = "GET movies";
            o.movies = movies;
            o.headers = req.headers;
            o.query = req.query;
            o.key = env.UNIQUE_KEY;
            res.json(o);
    
        }

    }
    
    
    

    
})
.post(authJwtController.isAuthenticated, async(req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    const movie = new Movie(req.body);
    if (movie.actors.length === 0) {
        o.status = 200;
        o.message = "FAIL: Actors can't be blank";
        o.headers = req.headers;
        o.query = req.query;
        o.key = env.UNIQUE_KEY;
        res.json(o);
        
    }
    else {
        movie.save();
        o.status = 200;
        o.message = "movie saved";
        o.headers = req.headers;
        o.query = req.query;
        o.key = env.UNIQUE_KEY;
        res.json(o);
    }
    
})
.put(authJwtController.isAuthenticated, (req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    o.status = 200;
    o.message = "FAIL: cannot update wihtout id";
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);

})
.delete(authController.isAuthenticated, (req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    o.status = 201;
    o.message = "FAIL: cannot delete without an id";
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);

});

router.route('/movies/:id')
.get(authJwtController.isAuthenticated, async(req, res) => {
    let id = req.params.id;
    let movies;
    let query = req.query;
    console.log("query", query);
    let includeReview = req.query.reviews;
    console.log("review", includeReview);
    let reviews;
    if (includeReview) {
        movies = await Movie.aggregate([
            {
                $match: { _id : ObjectId(id) }
            },
            {
                
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'movieId',
                    as: 'reviews'
                }
            },
            {
                $addFields: {
                    average_rating: { $avg: '$reviews.rating'}
                }
            }

        ])
    }
    else {
        movies = await Movie.findById(id); 

    }
    var o = getJSONObjectForMovieRequirement(req);
    o.status = 200;
    o.message = "GET movies by id";
    o.movies = movies;
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);
    
})
.post(authJwtController.isAuthenticated, (req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    let id = req.params.id;
    o.status = 200;
    o.message = "FAIL: Cannot create a new movie from an existing id";
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);
})
.put(authJwtController.isAuthenticated, async(req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    let id = req.params.id;
    var movies = await Movie.findByIdAndUpdate(id, { title: req.body.title});
    o.status = 200;
    o.message = "movie updated";
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);

})
.delete(authController.isAuthenticated, async(req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    let id = req.params.id;
    var movies = await Movie.findByIdAndDelete(id);
    o.status = 201;
    o.message = "movie deleted";
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);

});


router.route('/reviews')
.get(authJwtController.isAuthenticated, async(req, res) => {
    let reviews;
    if (req.body.title){
        reviews = await Review.find({'title' : { '$regex' : req.body.title, '$options' : 'i'}})

    }
    else {
        reviews = await Review.find();

    }
    var o = getJSONObjectForMovieRequirement(req);
    
    o.status = 200;
    o.message = "GET reviews";
    o.reviews = reviews;
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);
    
})
.post(authJwtController.isAuthenticated, async(req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    let id = req.body.movieId;
    const reviews = new Review(req.body);
    movies = await Movie.findById(id); 

    if (movies) {
        reviews.save();
        o.status = 200;
        o.message = "review created";
        o.headers = req.headers;
        o.query = req.query;
        o.key = env.UNIQUE_KEY;
        res.json(o);
        
    }
    else {
        o.status = 200;
        o.message = "movie id not found";
        o.headers = req.headers;
        o.query = req.query;
        o.key = env.UNIQUE_KEY;
        res.json(o);

    }
    
})
.delete(authController.isAuthenticated, async(req, res) => {
    var o = getJSONObjectForMovieRequirement(req);
    let id = req.body.id;
    console.log(id);
    var reviews = await Review.findByIdAndDelete(id);
    console.log(reviews);
    o.status = 201;
    o.message = "review deleted";
    o.headers = req.headers;
    o.query = req.query;
    o.key = env.UNIQUE_KEY;
    res.json(o);

});
  
// movie.save();

app.use('/', router);
app.listen(process.env.PORT || 8080);
console.log("server running on port "+ process.env.PORT);
module.exports = app; // for testing only


