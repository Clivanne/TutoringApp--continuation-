const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const app = express();

// set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // use the original name of the uploaded file
    }
});

const upload = multer({ storage: storage });

// create MySQL connection 
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'c237_tutoringapp'
});

// connect to MySQL database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

app.set('view engine', 'ejs'); // set EJS as the templating engine
app.use(express.static('public')); // serve static files from the public directory
app.use(express.urlencoded({ extended: false })); // parse URL-encoded bodies

// redirect root URL to login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// render login page
app.get('/login', (req, res) => {
    res.render('login');
});

// handle login form submission
app.post('/login', (req, res) => {
    const { email, password, userType } = req.body;

    // query for student login
    if (userType === 'student') {
        const sql = 'SELECT * FROM student WHERE student_email = ? AND student_password = ?';
        connection.query(sql, [email, password], (error, results) => {
            if (error) {
                console.error('Database query error:', error);
                res.status(500).send('Database error');
                return;
            }

            if (results.length > 0) {
                res.redirect('/indexStudent');
            } else {
                res.send('Invalid credentials for student');
            }
        });
    // query for tutor login
    } else if (userType === 'tutor') {
        const sql = 'SELECT * FROM tutor WHERE email = ? AND password = ?';
        connection.query(sql, [email, password], (error, results) => {
            if (error) {
                console.error('Database query error:', error);
                res.status(500).send('Database error');
                return;
            }

            if (results.length > 0) {
                res.redirect('/index');
            } else {
                res.send('Invalid credentials for tutor');
            }
        });
    } else {
        res.send('Invalid user type');
    }
});

// render index page with list of students
app.get('/index', (req, res) => {
    const sql = 'SELECT * FROM student';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('Error retrieving student');
        }
        res.render('index', { students: results });
    });
});

// render page for a specific student
app.get('/student/:id', (req, res) => {
    const studentId = req.params.id;
    const sql = 'SELECT * FROM student WHERE student_id = ?';
    connection.query(sql, [studentId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving student by ID');
        }
        if (results.length > 0) {
            res.render('student', { student: results[0] });
        } else {
            res.status(404).send('Student not found');
        }
    });
});

// render add student page
app.get('/addStudent', (req, res) => {
    res.render('addStudent');
});

// handle adding a new student
app.post('/addStudent', upload.single('image'), (req, res) => {
    const { name, schedule, points_earned, subject, contact } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }
    const sql = 'INSERT INTO student (name, schedule, points_earned, subject, contact, image) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [name, schedule, points_earned, subject, contact, image], (error, results) => {
        if (error) {
            console.error('Error adding student:', error);
            res.status(500).send('Error adding student');
        } else {
            res.redirect('/index');
        }
    });
});

// render edit student page
app.get('/editStudent/:id', (req, res) => {
    const studentId = req.params.id;
    const sql = 'SELECT * FROM student WHERE student_id = ?';
    connection.query(sql, [studentId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving student by ID');
        }
        if (results.length > 0) {
            res.render('editStudent', { student: results[0] });
        } else {
            res.status(404).send('Student not found');
        }
    });
});

// handle editing a student
app.post('/editStudent/:id', upload.single('image'), (req, res) => {
    const studentId = req.params.id;
    const { name, schedule, points_earned, subject, contact } = req.body;
    let image = req.body.currentImage;
    if (req.file) { // if new image is uploaded
        image = req.file.filename; // set image to be new image filename
    }
    const sql = 'UPDATE student SET name = ?, schedule = ?, points_earned = ?, subject = ?, contact = ?, image = ? WHERE student_id = ?';
    connection.query(sql, [name, schedule, points_earned, subject, contact, image, studentId], (error, results) => {
        if (error) {
            console.error('Error updating student:', error);
            res.status(500).send('Error updating student');
        } else {
            res.redirect('/index');
        }
    });
});

// handle deleting a student
app.get('/deleteStudent/:id', (req, res) => {
    const studentId = req.params.id;
    const sql = 'DELETE FROM student WHERE student_id = ?';
    connection.query(sql, [studentId], (error, results) => {
        if (error) {
            console.error('Error deleting student:', error);
            return res.status(500).send('Error deleting student');
        } else {
            res.redirect('/index');
        }
    });
});

// render reward page with list of rewards
app.get('/reward', (req, res) => {
    const sql = 'SELECT * FROM reward';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('Error retrieving rewards');
        }
        res.render('reward', { reward: results });
    });
});

// render rewarded page to select a student for awarding
app.get('/rewarded/:reward_id', (req, res) => {
    const rewardId = req.params.reward_id;
    const sqlStudents = 'SELECT * FROM student';
    const sqlReward = 'SELECT * FROM reward WHERE reward_id = ?';
    
    connection.query(sqlStudents, (error, students) => {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('Error retrieving students');
        }

        connection.query(sqlReward, [rewardId], (error, rewards) => {
            if (error) {
                console.error('Database query error:', error);
                return res.status(500).send('Error retrieving reward');
            }

            if (rewards.length === 0) {
                return res.status(404).send('Reward not found');
            }

            res.render('rewarded', { reward: rewards[0], students: students });
        });
    });
});

// handle awarding a reward to a student
app.post('/rewarded/:reward_id/award', (req, res) => {
    const rewardId = req.params.reward_id;
    const studentId = req.body.studentId;
    const awardSql = 'UPDATE student SET points_earned = points_earned + ? WHERE student_id = ?';
    connection.query(awardSql, [rewardId, studentId], (error, result) => {
        if (error) {
            console.error('Error awarding reward:', error);
            res.status(500).send('Error awarding reward');
        } else {
            console.log(`Reward ${rewardId} awarded to student ${studentId}`);
            res.redirect(`/awarded/${studentId}`); 
        }
    });
});

// render awarded page to congratulate the student
app.get('/awarded/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    res.render('awarded', { studentId: studentId });
});

// render index page for student view
app.get('/indexStudent', (req, res) => {
    const sql = 'SELECT * FROM student WHERE student_id = 1'; // assuming you want to fetch a specific student for the dashboard
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('Error retrieving student');
        }
        res.render('indexStudent', { students: results });
    });
});

// render reward page for student view
app.get('/rewardStudent', (req, res) => {
    const sql = 'SELECT * FROM reward';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).send('Error retrieving rewards');
        }
        res.render('rewardStudent', { reward: results });
    });
});

// handle requesting a reward by a student
app.post('/rewardStudent/:reward_id/request', (req, res) => {
    const rewardId = req.params.reward_id;
    const studentId = req.body.studentId;
    const requestSql = 'INSERT INTO reward_requests (student_id, reward_id) VALUES (?, ?)';
    connection.query(requestSql, [studentId, rewardId], (error, result) => {
        if (error) {
            console.error('Error requesting reward:', error);
            res.status(500).send('Error requesting reward');
        } else {
            console.log(`Reward ${rewardId} requested by student ${studentId}`);
            res.redirect(`/awardedStudent/${studentId}`); 
        }
    });
});

// render awardedStudent page for students
app.get('/awardedStudent/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    res.render('awardedStudent', { studentId: studentId });
});

// route to handle fetching tasks progress for a specific student
app.get('/progressStudent', (req, res) => {
    const studentId = 1; // Assuming you want to fetch tasks for a specific student

    // SQL query to select all tasks for the given student ID
    const sql = 'SELECT * FROM tasks WHERE student_id = ?';

    // execute the SQL query with studentId as parameter
    connection.query(sql, [studentId], (error, results) => {
        if (error) {
            // log any database query errors to console
            console.error('Database query error:', error);
            // send a 500 Internal Server Error response if there's an error
            return res.status(500).send('Error retrieving tasks');
        }
        // render the 'progressStudent' view and pass the fetched results as 'studentTasks'
        res.render('progressStudent', { studentTasks: results });
    });
});

// start server on port 3000
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
