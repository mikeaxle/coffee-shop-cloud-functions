import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as sendgrid from '@sendgrid/mail'
import { document } from 'firebase-functions/lib/providers/firestore';

// firebase admin init admin
admin.initializeApp()

// set app name
const APP_NAME = 'Coffee Shop App';

// set send grid api key
const API_KEY = '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'

// Creates new non-admin user
export const createUser = functions.https.onRequest((request, response) => {
    // request params to email account object
    const user = {
        email: request.body.email,
        password: request.body.password,
        phoneNumber: request.body.phoneNumber,
        displayName: request.body.firstName,
        photoURL: request.body.image
    }

    // request params for firestore document object
    const staffMember = request.body

    // create new user with automated password
    admin.auth().createUser(user)
    .then((newUser) => {
        console.log("New user created")
        // send welcome email
        sendWelcomeEmail(newUser.email, newUser.displayName, user.password, request.body.role)
        .then(() => {
            console.log("Welcome email sent")
            // create new user document
            createUserDocument(staffMember)
            .then((docRef => {
                console.log('new document added: ' + docRef.id)
                response.send("new user created, welcome email sent & new user document created: " + docRef.id)
            }))
            .catch((error) => {
                console.log(`Document failed to write: ${error}`)
                response.send("New user created and welcome email sent but Document write failed" )
            })
        })
        .catch((err) => {
            console.log("Welcome email sending failed: " + err)
            response.send("New user created but welcome email failed to send to: " + user.email)
        })
        
    })
    .catch((err) => {
        console.log(err)
        response.send("New user creation failed: " + err)
        
    })
})

// Sends a welcome email to the given user.
function sendWelcomeEmail (email, displayName, password, role) {
    // set api key for send grid
    sendgrid.setApiKey(API_KEY)

    // create message object
    const msg = {
        to: email,
        from: `${APP_NAME} <noreply@coffee-shop-app-d8f60.firebaseapp.com>`,
        subject: `Welcome to the ${APP_NAME}!`,
        html:   `<h2>Hey ${displayName || ''}! Welcome to ${APP_NAME}.</h2>
                <h3>I hope you will enjoy our service.<h3/>
                <p>You have received this email because you have been added as a staff member (${role}) <br>
                on a store managed by ${APP_NAME} by its Administrator. Please download the ${APP_NAME} from this <a href='http://google.com'>link</a> and login to access the store.</p>
                <p>Your login email address is: ${email}</p>
                <p>Your randomly generated password is: ${password}</p>`
    }

    // send message
    return sendgrid.send(msg)
  }

  // create a user document
  function createUserDocument(staffMember) {
      return admin.firestore().collection('Staff').add(staffMember)
  }