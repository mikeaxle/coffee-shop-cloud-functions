import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as sendgrid from '@sendgrid/mail'
import { document } from 'firebase-functions/lib/providers/firestore';
import { event } from 'firebase-functions/lib/providers/analytics';

// firebase admin init admin
admin.initializeApp()

// set app name
const APP_NAME = 'Coffee Shop App';

// set send grid api key
const API_KEY = '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'

// Creates new non-admin user
export const createUser = functions.https.onRequest(async (request, response) => {
    // request params to email account object
    const user = {
        email: request.body.email,
        password: request.body.password,
        phoneNumber: request.body.phoneNumber,
        displayName: request.body.firstName,
        photoURL: request.body.image
    }

    console.log(request.body)

    // request params for firestore document object
    const staffMember = request.body
    let newUser

    try {
        // create new user with automated password
        newUser = await admin.auth().createUser(user).then((_newUser) => { return _newUser.toJSON() })
        console.log("New authenticated user created.")
        
    } catch (error) {
        
        console.log(error)
        response.status(500).send("Errors have occurred:\n" + error)
    }


        // delete password from staffMember
        delete staffMember['password']

        // add uid to staff member
        staffMember.uid = newUser.uid;


    // create new user document
    const promise1 = createUserDocument(staffMember)

    // send welcome email
    const promise2 = sendWelcomeEmail(user.email, user.displayName, user.password, staffMember.role)

    // resolve all promises
    Promise.all([promise1, promise2])
    .then((results) => {
        console.log(results)
        response.send("User document created + welcome email sent")
    })
    .catch((error) => {
        console.log("Errors have occurred:\n" + error)
        response.status(500).send(error)
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
      return admin.firestore().collection('staff').add(staffMember)
  }

// deletes authenticated user when user is deleted in database
export const deleteAuthenicatedUser = functions.firestore
.document(`staff/{staffId}`).onDelete((snap, context) => {
    return admin.auth().deleteUser(snap.data().uid)
})