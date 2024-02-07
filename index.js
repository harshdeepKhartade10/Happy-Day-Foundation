import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ejs from "ejs";
import path from "path";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import * as fs from "fs/promises";
import Razorpay from "razorpay";
import mongoose from 'mongoose';
import multer from 'multer';
import { createWriteStream } from 'fs';
import numberToWords from 'number-to-words';
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose';
import findOrCreate from 'mongoose-findorcreate';
import nodemailer from "nodemailer";




const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const publicRouter = express.Router();
const adminRouter = express.Router();


app.use(bodyParser.urlencoded({ extended: true }));


let storage = multer.diskStorage({
  destination: 'public/images/',
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})

let upload = multer({
  storage: storage
})

dotenv.config();

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DATABASE, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
});



const conn = mongoose.connection;

conn.once('open', () => {
  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
});


const ngoPageSchema = new mongoose.Schema({
  page_name: { type: String, required: true },
  element_name: { type: String, required: true },
  top_image: String,
  top_title: { type: String, required: false },
  top_description: { type: String, required: false },
  content: [{
    content_element_name: { type: String, required: true },
    content_title: { type: String, required: false },
    content_description: { type: String, required: false },
    content_images: [String],
  }],
  dynamicProperties: mongoose.Schema.Types.Mixed,
});

const donationDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  address: { type: String, required: true },
  amount: { type: Number, required: true },
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String, required: true },
  razorpay_signature: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: Date, required: true },
  dynamicProperties: mongoose.Schema.Types.Mixed,
});

const slideShowSchema = new mongoose.Schema({
  page_name: { type: String, required: true },
  element_name: { type: String, required: true },
  title: { type: String},
  content: [{
    content_element_name: {type: String},
    content_images: [String],
  }],
  dynamicProperties: mongoose.Schema.Types.Mixed,
});

const userSchema = new mongoose.Schema ({
  name: String,
  email: String,
  password: String,
  googleId: String,
  secret: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,    
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

const NgoPage = mongoose.model('NgoPage', ngoPageSchema, 'NgoPage');
// console.log('Model collection name:', NgoPage.collection.name);

const donationDetails = mongoose.model('donationDetails', donationDetailsSchema, 'donationDetails');
// console.log('Model collection name:', donationDetails.collection.name);

const slideShowImages = mongoose.model('slideShowImages', slideShowSchema, 'slideShowImages');
// console.log('Model collection name:', slideShowImages.collection.name);

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.engine('ejs', ejs.renderFile);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
// For Forgot password email 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id).exec();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});





//Below is NGO website visible to all code
//Below is home page code **************************************************
publicRouter.get('/', async (req, res) => {
  try {
    const home_page_data = await NgoPage.findOne({
      page_name: 'home_page',

    });
    const home_page_data2 = await NgoPage.findOne({
      page_name: 'home_page',
      element_name: 'story',

    });
    const home_page_images_data = await slideShowImages.findOne({
      page_name: 'home_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', home_page_data);
    res.locals.data = {
      homeData: home_page_data,
      storyData: home_page_data2,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
      homeImages: home_page_images_data,
    };

    if (home_page_data) {
      res.render('index', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});


publicRouter.get('/public/ourstory', async (req, res) => {
  try {
    const about_us_page_data = await NgoPage.findOne({
      page_name: 'about_us_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', about_us_page_data);
    res.locals.data = {
      aboutUsData: about_us_page_data,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (about_us_page_data) {
      res.render('about', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

publicRouter.get('/public/vision', async (req, res) => {
  try {
    const vision_page_data = await NgoPage.findOne({
      page_name: 'vision_and_mission_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', vision_page_data);
    res.locals.data = {
      visionData: vision_page_data,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (vision_page_data) {
      res.render('vision', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

publicRouter.get('/public/activity', async (req, res) => {
  // res.render('activity');
  try {
    const activity_page_data = await NgoPage.findOne({
      page_name: 'activity_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', activity_page_data);
    res.locals.data = {
      activityData: activity_page_data,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (activity_page_data) {
      res.render('activity', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

publicRouter.get('/public/gallery', async (req, res) => {
  // res.render('gallery');
  try {
    const gallery_page_data = await NgoPage.findOne({
      page_name: 'gallery_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', gallery_page_data);
    res.locals.data = {
      galleryData: gallery_page_data,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (gallery_page_data) {
      res.render('gallery', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

publicRouter.get('/public/join', async (req, res) => {
  // res.render('activity');
  try {
    const join_page_data = await NgoPage.findOne({
      page_name: 'join_us_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', join_page_data);
    res.locals.data = {
      joinData: join_page_data,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (join_page_data) {
      res.render('join', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

publicRouter.get("/public/donate", async (req, res) => {
  // res.sendFile(__dirname + "/index.html");
  try {
    const donate_page_data = await NgoPage.findOne({
      page_name: 'donate_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', donate_page_data);
    res.locals.data = {
      donateData: donate_page_data,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (footer_data) {
      res.render('donate', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

let globalDonarDetails;

publicRouter.post("/payNow", (req, res) => {
  const { amount, name, donorDetails } = req.body;
  globalDonarDetails = donorDetails;
  // console.log("donate button pressed");
  if (!amount) {
    return res.status(400).send("Amount is required.");
  }

  // Ensure that donorDetails is correctly extracted
  // console.log("donorDetails:", donorDetails);

  var options = {
    amount: amount * 100, // Amount in the smallest currency unit (paise)
    currency: "INR",
    receipt: `order_rcptid_${Date.now()}`,
  };

  instance.orders.create(options, function (err, order) {
    if (err) {
      console.error("Error creating order:", err);
      res.status(500).send("Error creating order");
    } else if (order && order.id) {
      // console.log("Order created successfully:", order.id);
      res.send({ orderId: order.id });
    } else {
      console.error("Unexpected response from Razorpay:", order);
      res.status(500).send("Unexpected response from Razorpay");
    }
  });
});


publicRouter.post("/api/payment/verify", async (req, res) => {
  let body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;

  var expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  var response = { signatureIsValid: false };

  if (expectedSignature === req.body.razorpay_signature) {
    // console.log("SAHIL",globalDonarDetails);
    const donorData = {
      name: globalDonarDetails.name,
      email: globalDonarDetails.email,
      phoneNo: globalDonarDetails.mobileNo,
      country: globalDonarDetails.country,
      state: globalDonarDetails.state,
      address: globalDonarDetails.address,
      amount: globalDonarDetails.amount,
      razorpay_order_id: req.body.razorpay_order_id,
      razorpay_payment_id: req.body.razorpay_payment_id,
      razorpay_signature: req.body.razorpay_signature,
      time: Date.now(),
      date: Date.now(),
    };

    const newDonor = new donationDetails(donorData);
    // console.log('sahil below is donar data:', donorData);
    await newDonor.save();
    response = { signatureIsValid: true };
    // res.render("thankyou.ejs");
  }

  res.send(response);
});

publicRouter.get('/thankyou', async (req, res) => {
  // res.render('thankyou');
  try {
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', header_data);
    res.locals.data = {
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (header_data) {
      res.render('thankyou', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
})

publicRouter.get('/generatePDF', async (req, res) => {
  const doc = new PDFDocument();
  const writeStream = createWriteStream('thankyou.pdf');

  // Handle the finish event of the writeStream
  writeStream.on('finish', async () => {
    // console.log('PDF writing has finished');
    res.download('thankyou.pdf'); // Offer the generated PDF for download
  });


  // Pipe the PDF output to the writeStream
  doc.pipe(writeStream);

  // Set the font for the entire document
  doc.font('Helvetica');

  // Center the logo horizontally
  const logoX = 200;
  doc.image("./public/images/ngo_logo_new.png", logoX, 0, { width: 200 });
  doc.moveDown(10); // Some space

  // Add NGO name centered, in bold and large size
  // doc.fontSize(26).font('Helvetica-Bold').text('Happy Day Foundation', { align: 'center' });
  // doc.moveDown(1); // Some space

  // Add a small description of the NGO
  doc.fontSize(14).text('A non-profit organization dedicated to making the world a better place for underprivileged children.', { align: 'center' });
  doc.moveDown(2); // Some space

  // Donor details
  doc.fontSize(18).text('Donor Details:', { align: 'center' });
  doc.fontSize(14).text('Name: ' + req.query.userName);
  doc.text('Donation Amount: ' + req.query.donationAmount + ' INR');
  const donationAmountInWords = numberToWords.toWords(req.query.donationAmount);
  doc.fontSize(14).text('Amount in Text: ' + donationAmountInWords.charAt(0).toUpperCase() + donationAmountInWords.slice(1) + ' Rupees Only');
  // doc.moveDown(1); // Some space
  doc.fontSize(14).text('E-mail: ' + req.query.email);
  doc.text('Mobile No.: ' + req.query.mobileNo);
  doc.fontSize(14).text('Country: ' + req.query.country);
  doc.text('State: ' + req.query.state);
  doc.fontSize(14).text('Address: ' + req.query.address);
  doc.moveDown(1); // Some space

  // Thank the donor for their precious donation
  doc.fontSize(18).text('Thank You for Your Generous Donation!', { align: 'center' });
  doc.moveDown(2); // Some space

  // Impact Statement
  doc.fontSize(18).text('Impact of Your Donation:', { align: 'center' });
  doc.fontSize(14).text('Your generous contribution plays a vital role in improving the lives of underprivileged children. At Happy Day Foundation, we are dedicated to enhancing the health and education of these young minds.', { align: 'center' });
  doc.moveDown(1); // Some space
  doc.fontSize(14).text('With your support, we can provide:', { align: 'left' });
  doc.fontSize(14).text(' - Access to quality healthcare to ensure their well-being.', { align: 'left' });
  doc.fontSize(14).text(' - Educational opportunities, including books, school supplies, and quality teaching.', { align: 'left' });
  doc.moveDown(2); // Some space

  // Contact Information
  doc.fontSize(18).text('Contact Information:', { align: 'center' });
  doc.fontSize(14).text('For inquiries and support, please feel free to contact us at:', { align: 'left' });
  doc.fontSize(14).text('Email: contact@happydayfoundation.org', { align: 'left' });
  doc.fontSize(14).text('Phone: +1 (123) 456-7890', { align: 'left' });
  doc.fontSize(14).text('Address: 123 Sunshine Street, Cityville, Country', { align: 'left' });
  doc.moveDown(1); // Some space

  // Thank You
  doc.fontSize(20).font('Helvetica-Bold').text('Thank You for Your Support!', { align: 'center' });

  doc.end(); // Finalize the PDF

});

publicRouter.get('/public/:element_name', async (req, res) => {
  try {
    const elementName = req.params.element_name;

    // Fetch the page details from the database based on the element_name
    const pageDetails = await NgoPage.findOne({ element_name: elementName });

    if (!pageDetails) {
      // Handle case when the page is not found
      return res.status(404).send(`404 Error ${elementName} page does not exist`);
    }
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });
    const activityImages1 = await slideShowImages.findOne({
      element_name: elementName,
    });

    // console.log('Retrieved data:', activityImages1);
    res.locals.data = {
      contentElement: pageDetails,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
      activityImages:activityImages1,
    };
    if (pageDetails) {
      res.render('new_activity_page', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});




// *********
app.get('/admin',function(req,res){
  res.status(400).send(`
  <html>
    <head>
      <script>
        alert('Bad Request. Redirecting...');
        window.location.href = '/';
      </script>
    </head>
    <body>
      <p>Redirecting...</p>
    </body>
  </html>
`);
  
});
// ********

// Mount the publicRouter first
app.use('/', publicRouter);



//Code completed












//Below is forgot-password code **************************************************

adminRouter.get('/forgot-password', (req, res) => {
  try {
    res.render('forgot-password.ejs', { error: null, success: null });
  } catch (error) {
    console.log(error.message);
  }
});

adminRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ username: email });

    if (!user) {
      return res.render("forgot-password", { error: "User not found", success: null });
    }

    // Generate a unique token for the reset link
    const token = crypto.randomBytes(20).toString('hex');

    // Set the token and expiration time in the user document
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour

    await user.save();

    // Create a reset password link
    const resetLink = `${req.protocol}://${req.headers.host}/admin/reset-password/${token}`;

    // Send an email with the reset link
    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset',
      html: `Click <a href="${resetLink}">here</a> to reset your password.`,
    });

    res.render("forgot-password", { error: null, success: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.render("reset-password", { error: "Invalid or expired reset link", success: null, token: null });
    }

    // If the token is valid, render the reset password view with the token
    res.render("reset-password", { token, error: null, success: null });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.render("reset-password", { error: "Invalid or expired reset link", success: null });
    }

    // Update the user's password
    user.setPassword(newPassword, async () => {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      // Render the login page after successful password reset
      res.render("login", { error: null, success: "Password reset successfully. Please login with your new password." });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//Above is forgot-password code **************************************************

//Below is login code **************************************************
adminRouter.get("/login", function(req, res){
  // res.render("login");
  res.render("login", { error: null }); 
});

adminRouter.post("/login", function(req, res, next) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  passport.authenticate("local", function(err, user, info) {
    if (err) {
      console.log(err);
      return next(err);
    }

    if (!user) {
      // If authentication fails, show a popup with an error message
      return res.render("login", { error: "Invalid username or password" });
    }

    req.login(user, function(err) {
      if (err) {
        console.log(err);
        return next(err);
      }

       // If authentication succeeds, pass user information to the admin page
       return res.render("admin", { user: { name: user.name, email: user.username }, success: "Login successful!" });
    });
  })(req, res, next);
});


//Below is register code **************************************************
adminRouter.get("/register", async function(req, res){
  // res.render("register");
  if (req.isAuthenticated()){
    res.render('register');
  } else {
    // res.redirect("/admin/login");
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Unauthorized Access. Redirecting...');
          window.location.href = '/';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  }
});

adminRouter.post("/register", function(req, res){

    // Create a user object with all necessary properties
    var newUser = new User({
      name: req.body.name,
      username: req.body.username
    });
  
    // Use the User.register method to register the user
    User.register(newUser, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      // res.redirect("/admin/register");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('Admin with same username already exists. Redirecting...');
            window.location.href = '/admin/register';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    } else {
      passport.authenticate("local")(req, res, function(){
        // res.redirect("/admin/login");
        res.status(400).send(`
      <html>
        <head>
          <script>
            alert('Congratlations you are our new member, welcome to Happy Day Foundation family.');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
      });
    }
  });

});

//Below is logout code **************************************************
adminRouter.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Logged Out successfully. Redirecting...');
          window.location.href = '/';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
    // res.redirect("/");
  });
});


//Below is admin pages code **************************************************
adminRouter.get("/admin", async function(req, res){
  if (req.isAuthenticated()){
    // Assuming you have a user object in your session with email
    const userEmail = req.user.username; // Adjust this based on your authentication setup

    // Fetch additional details from the database based on email
    const adminDetails = await User.findOne({ username: userEmail });
    res.render("admin",{user:{ name: adminDetails.name, email: adminDetails.username }});
  } else {
    // res.redirect("/admin/login");
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('You were logged out. Redirecting...');
          window.location.href = '/admin/login';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  }
});

//Below is code to check existing users and to delete users **************************************************
adminRouter.get('/usersDetails', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await User.find();
      res.render('usersDetails.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/confirm-delete/:id', async (req, res) => {
  const userId = req.params.id;
  res.render('confirm-delete', { userId ,error:null});
});

// Add a middleware to check if the user is authenticated before performing any deletion
adminRouter.use((req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    // res.redirect('/admin/login');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('You were logged out. Redirecting...');
          window.location.href = '/admin/login';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  }
});

// Add a route to handle the actual deletion after confirmation
adminRouter.post('/delete_existing_user', async (req, res) => {
  const { id } = req.body;
  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Redirect to the confirmation page with the user ID
    res.redirect(`/confirm-delete/${id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Add a route to handle the actual deletion after confirmation
// adminRouter.post('/confirm-delete/:id', passport.authenticate('local', { failureRedirect: '/admin/login' }), async (req, res, next) => {
//   const userId = req.params.id;

//   passport.authenticate("local", async function (err, user, info) {
//     if (err) {
//       console.log(err);
//       return next(err);
//     }

//     if (!user) {
//       // If authentication fails, show a popup with an error message
//       return res.render("confirm-delete", { error: "Invalid username or password" });
//     }

//     try {
//       // If authentication succeeds, delete the user
//       await User.findByIdAndDelete(userId);
//         // Redirect to the admin page with a success message
//         return res.render("admin", { success: "User deleted successfully." });
//     } catch (error) {
//       console.error(error);
//       return res.status(500).send('Error deleting user');
//     }
//   })(req, res, next);
// });
// Add a route to handle the actual deletion after confirmation
adminRouter.post('/confirm-delete/:id', passport.authenticate('local', { failureRedirect: '/admin/login' }), async (req, res, next) => {
  const userId = req.params.id;

  passport.authenticate("local", async function (err, user, info) {
    if (err) {
      console.log(err);
      return next(err);
    }

    if (!user) {
      // If authentication fails, show a popup with an error message
      // return res.render("confirm-delete", { error: "Invalid username or password" });
      return  res.status(400).send(`
      <html>
        <head>
          <script>
            alert('Invalid username or password so please login in again');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }

    try {
      // If authentication succeeds, delete the user
      await User.findByIdAndDelete(userId);

      // Fetch admin details from the database based on email
      const userEmail = req.user.username;
      const adminDetails = await User.findOne({ username: userEmail });

      // Render the admin page with the user details
      // res.render("admin", { user: { name: adminDetails.name, email: adminDetails.username }, success: "User deleted successfully." });
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('Admin deleted Successfully. Redirecting...');
            window.location.href = '/admin/admin';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    } catch (error) {
      console.error(error);
      return res.status(500).send('Error deleting user');
    }
  })(req, res, next);
});



//************************************************************************************************************* */

//admin dashboard below 



adminRouter.get('/admin_home', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'home_page' });
      res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/admin_about_us',async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'about_us_page' });
    res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }  
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/admin_vision', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'vision_and_mission_page' });
    res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
adminRouter.get('/admin_gallery', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'gallery_page' });
    res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
adminRouter.get('/admin_activity', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'activity_page' });
    res.render('admin_add_new_activity.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
adminRouter.get('/admin_join_us', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'join_us_page' });
      res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
adminRouter.get('/social_media', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'social_media_page' });
    res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
adminRouter.get('/admin_header', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'header_page' });
    res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
adminRouter.get('/admin_footer', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'footer_page' });
    res.render('admin_home.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
adminRouter.get('/admin_contact_us', async (req, res) => {
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.find({ page_name: 'contact_us_page' });
      res.render('contact_details.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/admin_donation', async (req, res) => {
  try {
    if (req.isAuthenticated()){
       // Get start and end dates from the query parameters
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Set default start and end dates if not provided
    const defaultStartDate = new Date('2000-01-01');
    const defaultEndDate = new Date(); // Today

    // Use default dates if not provided
    const effectiveStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const effectiveEndDate = endDate ? new Date(endDate) : defaultEndDate;
    effectiveEndDate.setHours(23, 59, 59, 999);

    // Fetch donations within the specified date range
    const data = await donationDetails.find({
      time: { $gte: effectiveStartDate, $lte: effectiveEndDate }
    });

    // Calculate the total donation amount for the entire period
    const totalDonationAmountAll = (await donationDetails.find()).reduce((total, donation) => total + donation.amount, 0);

    // Calculate the total donation amount for the specified date range
    const totalDonationAmountRange = data.reduce((total, donation) => total + donation.amount, 0);

     // Find the highest and lowest donations
     const highestDonation = data.reduce((max, donation) => (donation.amount > max ? donation.amount : max), 0);
     const lowestDonation = data.reduce((min, donation) => (donation.amount < min ? donation.amount : min), Infinity);

    // Render the page with data and total donation amounts
    res.render('donation_details.ejs', {
      data,
      totalDonationAmountAll,
      totalDonationAmountRange,
      startDate: effectiveStartDate.toISOString().split('T')[0], // Pass the effective start date to maintain the selected date range
      endDate: effectiveEndDate.toISOString().split('T')[0] ,
      highestDonation, lowestDonation    // Pass the effective end date to maintain the selected date range
    });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.post('/add_data', upload.fields([
  { name: 'topImage', maxCount: 1 },
  { name: 'contentImage[]', maxCount: 10 }, // Adjust maxCount as needed
]), async (req, res) => {
  try {
    
    // Extract data from the form submission
    const {
      pageName,
      elementName,
      topTitle,
      topDescription,
      contentElementName,
      contentTitle,
      contentDescription,
    } = req.body;
    // console.log('All Files:', req.files);
    // Create a new NgoPage document
    const newNgoPageDocument = new NgoPage({
      page_name: pageName,
      element_name: elementName,
      top_title: topTitle || '',
      top_description: topDescription || '',
      top_image: req.files['topImage'] ? req.files['topImage'][0].filename : '',
      content: [],
    });

    // Iterate through content arrays and add to the document
    for (let i = 0; i < contentElementName.length; i++) {
      const contentElement = {
        content_element_name: contentElementName[i],
        content_title: contentTitle[i] || '',
        content_description: contentDescription[i] || '',
        content_images: [],
      };

      const contentImageField = req.files['contentImage[]'];

      if (contentImageField && contentImageField.length > 0 && contentImageField[i]) {
        // Only push the content image associated with the current content element
        contentElement.content_images.push(contentImageField[i].filename);
      }

      newNgoPageDocument.content.push(contentElement);
    }

    // Save the NgoPage document
    await newNgoPageDocument.save();
    // console.log('Model collection name before saving data:', NgoPage.collection.collectionName);

    // // res.send('Data and images added successfully.');
    //  // Send a JSON response indicating success
    //  res.json({ success: true, message: 'Data and images added successfully.' });
    // res.redirect("/admin/admin");
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Data added successfully. Redirecting...');
          window.location.href = '/admin/admin';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete existing data
adminRouter.post('/delete_home_page_data', async (req, res) => {
  const { id } = req.body;
  try {
    await NgoPage.findByIdAndDelete(id);
    // res.redirect('/admin/admin');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Data Deleted Successfully. Redirecting...');
          window.location.href = '/admin/admin';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


adminRouter.get('/edit_home_page_data', async (req, res) => {
  const { id } = req.query;
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.findById(id);
      if (!data) {
        console.error('Data not found for id:', id);
        return res.status(404).send('Data not found');
      }
      res.render('edit_home_page_data.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.post('/update_home_page_data', upload.fields([
  { name: 'topImage', maxCount: 1 },
  { name: 'contentImage[]', maxCount: 10 },
]), async (req, res) => {
  const { pageName, elementName, topTitle, topDescription, deleteTopImage, contentImageFlags } = req.body;

  const { id } = req.query;

  try {
    const existingData = await NgoPage.findById(id);

    if (!existingData) {
      console.error('Data not found for id:', id);
      return res.status(404).send('Data not found');
    }

    existingData.page_name = pageName;
    existingData.element_name = elementName;
    existingData.top_title = topTitle;
    existingData.top_description = topDescription;

    // Update top image only if a new image is uploaded
    if (req.files && req.files['topImage'] && req.files['topImage'].length > 0) {
      // Delete existing top image only if deleteTopImage flag is set
      if (deleteTopImage && existingData.top_image) {
        const topImagePath = path.join(__dirname, 'public/images', existingData.top_image);
        await fs.unlink(topImagePath).catch(error => console.error('Error deleting top image:', error));
        existingData.top_image = '';
      }

      // Update top image with the filename of the first file
      existingData.top_image = req.files['topImage'][0].filename;
    }

    // existingData.content = existingData.content || [];
    let j = 0;

    for (let i = 0; i < req.body.contentElementName.length; i++) {
      const contentElementName = req.body.contentElementName[i];
      const isImageUploaded = parseInt(contentImageFlags[i]) === 1;
      // console.log(`is image present: ${isImageUploaded}`);

      // Check if content element with the same name already exists
      const existingContentElementIndex = existingData.content.findIndex(
        (existingContent) => existingContent.content_element_name === contentElementName
      );

      if (existingContentElementIndex !== -1) {
        // Content element already exists, update it
        const existingContentElement = existingData.content[existingContentElementIndex];

        // Add new content images to the existing content element only if an image is uploaded
        const contentImageField = req.files['contentImage[]'];

        if (isImageUploaded && contentImageField && contentImageField[j]) {
          existingContentElement.content_images = existingContentElement.content_images || [];
          existingContentElement.content_images.push(contentImageField[j].filename);
          // console.log(`image added to element ${contentElementName}, and value of j is ${j}`);
          j++;
        }

        // Update other properties if needed
        existingContentElement.content_title = req.body.contentTitle[i] || '';
        existingContentElement.content_description = req.body.contentDescription[i] || '';
      } else {
        // No existing content element with the same name, create a new one
        const newContentElement = {
          content_element_name: contentElementName,
          content_title: req.body.contentTitle[i] || '',
          content_description: req.body.contentDescription[i] || '',
          content_images: [],
        };

        // Add new content images to the new content element if an image is uploaded
        const contentImageField = req.files['contentImage[]'];

        if (isImageUploaded && contentImageField && contentImageField.length > j) {
          newContentElement.content_images.push(contentImageField[j].filename);
          // console.log(`image added to element ${contentElementName}, and value of j is ${j}`);
          j++;
        }

        existingData.content.push(newContentElement);
      }

    }

    // Delete selected content images
    const deleteContentImages = req.body.deleteContentImage || [];
    for (let i = 0; i < existingData.content.length; i++) {
      existingData.content[i].content_images = existingData.content[i].content_images.filter(
        (image) => !deleteContentImages.includes(image)
      );


    }

    // Delete selected content elements
    const deleteContentElements = req.body.deleteContentElement || [];

    // Iterate in reverse order to safely remove elements
    for (let i = existingData.content.length - 1; i >= 0; i--) {
      if (deleteContentElements.includes(i.toString())) {
        // Delete content images associated with the content element
        const contentImagesToDelete = existingData.content[i].content_images || [];
        for (const contentImageToDelete of contentImagesToDelete) {
          const imagePath = path.join(__dirname, 'public/images', contentImageToDelete);
          await fs.unlink(imagePath).catch(error => console.error('Error deleting content image:', error));
        }

        // Remove the entire content element from the array
        existingData.content.splice(i, 1);
      }
    }

    const updatedData = await existingData.save();
    // res.redirect('/admin/admin');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Data Updated Successfully. Redirecting...');
          window.location.href = '/admin/admin';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.post('/add_new_activity', upload.fields([
  { name: 'topImage', maxCount: 1 },
  { name: 'contentImage[]', maxCount: 10 }, // Adjust maxCount as needed
]), async (req, res) => {
  try {
    // Extract data from the form submission
    const {
      pageName,
      elementName,
      topTitle,
      topDescription,
      contentElementName,
      contentTitle,
      contentDescription,
    } = req.body;

    // Check if a page with the same element_name already exists
    const existingPage = await NgoPage.findOne({ element_name: elementName });

    if (existingPage) {
      // If the page exists, send an HTML response with a script to show a pop-up
      res.status(400).send(`
        <html>
          <head>
            <script>
              alert('Webpage with the same element_name already exists. Redirecting...');
              window.location.href = '/admin/admin';
            </script>
          </head>
          <body>
            <p>Redirecting...</p>
          </body>
        </html>
      `);
    
      return;
    }
    

    // Create a new NgoPage document
    const newNgoPageDocument = new NgoPage({
      page_name: pageName,
      element_name: elementName,
      top_title: topTitle || '',
      top_description: topDescription || '',
      // top_image: req.files['topImage'] ? req.files['topImage'][0].filename : '',
      top_image: req.files && req.files['topImage'] ? req.files['topImage'][0].filename : '',
      // top_image: req.files && req.files['topImage'] ? req.files['topImage'][0].filename : '',
      content: [],
    });

    // Iterate through content arrays and add to the document
    for (let i = 0; i < contentElementName.length; i++) {
      const contentElement = {
        content_element_name: contentElementName[i],
        content_title: contentTitle && contentTitle[i] ? contentTitle[i] : '',
        content_description: contentDescription && contentDescription[i] ? contentDescription[i] : '',
        content_images: [],
      };

      const contentImageField =  req.files && req.files['contentImage[]'];

      if (contentImageField && contentImageField.length > 0 && contentImageField[i]) {
        // Only push the content image associated with the current content element
        contentElement.content_images.push(contentImageField[i].filename);
      }
      // if (
      //   contentImageField &&
      //   Array.isArray(contentImageField) &&
      //   contentImageField.length > 0 &&
      //   contentImageField[i] &&
      //   contentImageField[i].filename
      // ) {
      //   // Only push the content image associated with the current content element
      //   contentElement.content_images.push(contentImageField[i].filename);
      // } else {
      //   // Handle the case where contentImageField[i] is undefined or does not have a filename property
      //   console.error(`contentImageField[${i}] is undefined or does not have a filename property`);
      //   // You may choose to set a default value or handle this case differently
      // }

      newNgoPageDocument.content.push(contentElement);
    }

    // Save the NgoPage document
    await newNgoPageDocument.save();

    // Render the dynamic page (assuming you have a template for it)
    // res.redirect('/admin/admin');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('New Activity Added Successfully. Redirecting...');
          window.location.href = '/admin/admin';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);


  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});


adminRouter.get('/edit_contact_details', async (req, res) => {
  const { id } = req.query;
  try {
    if (req.isAuthenticated()){
      const data = await NgoPage.findById(id);
      if (!data) {
        console.error('Data not found for id:', id);
        return res.status(404).send('Data not found');
      }
      res.render('edit_contact_details.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/join', async (req, res) => {
  // res.render('activity');
  try {
    const join_page_data = await NgoPage.findOne({
      page_name: 'join_us_page',

    });
    // Fetch data for the header
    const header_data = await NgoPage.findOne({
      page_name: 'header_page',
    });
    // Fetch data for the social media
    const social_media_data = await NgoPage.findOne({
      page_name: 'social_media_page',
    });
    // Fetch data for the footer
    const footer_data = await NgoPage.findOne({
      page_name: 'footer_page',
    });
    const contact_data = await NgoPage.findOne({
      page_name: 'contact_us_page',
    });

    // console.log('Retrieved data:', join_page_data);
    res.locals.data = {
      joinData: join_page_data,
      headerData: header_data,
      socialMediaData: social_media_data,
      footerData: footer_data,
      contactUsData: contact_data,
    };

    if (join_page_data) {
      res.render('join', { data: res.locals.data });
    } else {
      res.status(404).send('Page not found');
    }

  } catch (err) {
    console.error('Error fetching page data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/slideShowImages',async (req, res) => {
 try {
  if (req.isAuthenticated()){
    const data = await slideShowImages.find();
    res.render('slideshow_images.ejs', { data });
  } else {
    // res.redirect("/admin/login");
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('You were logged out. Redirecting...');
          window.location.href = '/admin/login';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



adminRouter.post('/add_images_to_slideShow', upload.fields([
  { name: 'contentImage[]', maxCount: 10 }, // Adjust maxCount as needed
]), async (req, res) => {
  try {
    // Extract data from the form submission
    const {
      pageName,
      elementName,
      title,
    } = req.body;
    // console.log('All Files:', req.files);
    // Create a new NgoPage document
    const newslideShowImagesDocument = new slideShowImages({
      page_name: pageName,
      element_name: elementName,
      top_title: title || '',
      content: [],
    });



      const contentElement = {
        content_element_name: req.body.contentElementName,
        content_images: [],
      };

      const contentImageField = req.files['contentImage[]'];


      if (contentImageField && contentImageField.length > 0 && contentImageField[0]) {
        // Only push the content image associated with the current content element
        contentElement.content_images.push(contentImageField[0].filename);
      }

      newslideShowImagesDocument.content.push(contentElement);
    


    // Save the NgoPage document
    await newslideShowImagesDocument.save();
    // console.log('Model collection name before saving data:', slideShowImages.collection.collectionName);

    // res.send('Data and images added successfully.');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Data and images added successfully. Redirecting...');
          window.location.href = '/admin/admin';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.get('/edit_slideShowImages_data', async (req, res) => {
  const { id } = req.query;
  try {
    if (req.isAuthenticated()){
      const data = await slideShowImages.findById(id);
      if (!data) {
        console.error('Data not found for id:', id);
        return res.status(404).send('Data not found');
      }
      res.render('edit_slideShowImages.ejs', { data });
    } else {
      // res.redirect("/admin/login");
      res.status(400).send(`
      <html>
        <head>
          <script>
            alert('You were logged out. Redirecting...');
            window.location.href = '/admin/login';
          </script>
        </head>
        <body>
          <p>Redirecting...</p>
        </body>
      </html>
    `);
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.post('/update_slideShowImages', upload.fields([
  { name: 'contentImage[]', maxCount: 10 },
]), async (req, res) => {
  const { pageName, elementName, title, contentImageFlags, contentElementName } = req.body;

  const { id } = req.query;

  try {
    const existingData = await slideShowImages.findById(id);

    if (!existingData) {
      console.error('Data not found for id:', id);
      return res.status(404).send('Data not found');
    }

    existingData.page_name = pageName;
    existingData.element_name = elementName;
    existingData.top_title = title;
 // existingData.content = existingData.content || [];
  // Initialize j before using it
let j = 0;
// console.log('Content Element Name:', contentElementName);
// console.log('Length of Content Element Name:', contentElementName.length);

// Check if req.body.contentElementName is defined and not empty
if (contentElementName && contentElementName.length > 0) {
  // Loop through each content element in req.body
  for (let i = 0; i < contentElementName.length; i++) {
    const contentElementName = req.body.contentElementName[i];
    const isImageUploaded = parseInt(contentImageFlags[i]) === 1;
    // console.log(`is image present: ${isImageUploaded}`);

    // Check if content element with the same name already exists
    const existingContentElementIndex = existingData.content.findIndex(
      (existingContent) => existingContent.content_element_name === contentElementName
    );

    if (existingContentElementIndex !== -1) {
      // Content element already exists, update it
      const existingContentElement = existingData.content[existingContentElementIndex];

      // Add new content images to the existing content element only if an image is uploaded
      const contentImageField = req.files['contentImage[]'];

      if (isImageUploaded && contentImageField && contentImageField[j]) {
        existingContentElement.content_images = existingContentElement.content_images || [];
        existingContentElement.content_images.push(contentImageField[j].filename);
        // console.log(`image added to element ${contentElementName}, and value of j is ${j}`);
        j++;
      }
    } else {
      // No existing content element with the same name, create a new one
      const newContentElement = {
        content_element_name: contentElementName,
        content_images: [],
      };

      // Add new content images to the new content element if an image is uploaded
      const contentImageField = req.files['contentImage[]'];

      if (isImageUploaded && contentImageField && contentImageField.length > j) {
        newContentElement.content_images.push(contentImageField[j].filename);
        // console.log(`image added to element ${contentElementName}, and value of j is ${j}`);
        j++;
      }

      existingData.content.push(newContentElement);
    }
  }
} else {
  // console.log('req.body.contentElementName is empty or undefined');
}


    // Delete selected content images
    const deleteContentImages = req.body.deleteContentImage || [];
    for (let i = 0; i < existingData.content.length; i++) {
      existingData.content[i].content_images = existingData.content[i].content_images.filter(
        (image) => !deleteContentImages.includes(image)
      );


    }

    // Delete selected content elements
    const deleteContentElements = req.body.deleteContentElement || [];

    // Iterate in reverse order to safely remove elements
    for (let i = existingData.content.length - 1; i >= 0; i--) {
      if (deleteContentElements.includes(i.toString())) {
        // Delete content images associated with the content element
        const contentImagesToDelete = existingData.content[i].content_images || [];
        for (const contentImageToDelete of contentImagesToDelete) {
          const imagePath = path.join(__dirname, 'public/images', contentImageToDelete);
          await fs.unlink(imagePath).catch(error => console.error('Error deleting content image:', error));
        }

        // Remove the entire content element from the array
        existingData.content.splice(i, 1);
      }
    }

    const updatedData = await existingData.save();
    // res.redirect('/admin/admin');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Data updates successfully. Redirecting...');
          window.location.href = '/admin/slideShowImages';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete existing data
adminRouter.post('/delete_slideShowImages_data', async (req, res) => {
  const { id } = req.body;
  try {
    await slideShowImages.findByIdAndDelete(id);
    // res.redirect('/admin/admin');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Data deleted successfully. Redirecting...');
          window.location.href = '/admin/slideShowImages';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});




adminRouter.post('/add_contact_details',async (req, res) => {
  try {
    const {
      pageName,
      elementName,
      topTitle,
      topDescription,
      contentElementName,
      whatsappNo,
      mail1,
      mail2,
      phoneNo,
    } = req.body;
    // console.log(`data: ${req.body}`);

    // Create a new NgoPage document
    const newNgoPageDocument = new NgoPage({
      page_name: pageName,
      element_name: elementName,
      top_title: topTitle || '',
      top_description: topDescription || '',
      content: [],
      dynamicProperties: {
        whatsappNo,
        email1: mail1,
        email2: mail2,
        phoneNo,
        // Add more dynamic properties if needed
      },
    });

    // Iterate through content arrays and add to the document
    for (let i = 0; i < contentElementName.length; i++) {
      const contentElement = {
        content_element_name: contentElementName[i],
      };
      // You may add more properties to contentElement if needed

      newNgoPageDocument.content.push(contentElement);
    }

    // Save the NgoPage document
    await newNgoPageDocument.save();

    // res.send('Data and images added successfully.');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Contact Details added successfully. Redirecting...');
          window.location.href = '/admin/admin_contact_us';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.post('/update_contact_details',async (req, res) => {
  const { pageName, elementName, topTitle, topDescription, whatsappNo, mail1, mail2, phoneNo } = req.body;
  const { id } = req.query;

  try {
    const existingData = await NgoPage.findById(id);

    if (!existingData) {
      console.error('Data not found for id:', id);
      return res.status(404).send('Data not found');
    }

    // console.log('Existing Data before update:', existingData);

    existingData.page_name = pageName;
    existingData.element_name = elementName;
    existingData.top_title = topTitle;
    existingData.top_description = topDescription;

    // Update the entire dynamicProperties object
    existingData.dynamicProperties = {
      whatsappNo,
      email1: mail1,
      email2: mail2,
      phoneNo,
    };

    // console.log('Existing Data after update:', existingData);

    const updatedData = await existingData.save();
    // console.log('Updated Data:', updatedData);
    // res.redirect('/admin/admin');
    res.status(400).send(`
    <html>
      <head>
        <script>
          alert('Contact Details updated successfully. Redirecting...');
          window.location.href = '/admin/admin_contact_us';
        </script>
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Mount the adminRouter
app.use('/admin', adminRouter);
