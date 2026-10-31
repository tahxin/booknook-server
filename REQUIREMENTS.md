B14-A8-Cat_Ron

B14-A8-RON.mp4
BookNook – A Small Online Library
Project Theme
BookNook is a small online library. Users can see all books, add new books, and borrow a book for a few days. Users can see the books they borrowed and return them. Simple idea: “Add a book, borrow a book, return a book.”

Key Rules: 
GitHub Commits: 
Include a minimum of 15 notable GitHub commits on the client side.
Include a minimum of 8 notable GitHub commits on the server side 
Readme.md: Add a meaningful readme.md file with the name of your website and a live site URL on client side. Include a minimum of five bullet points to feature your website.  
Lorem Text: Don’t use any Lorem ipsum text; you can not use the default alert to show any error or success message.
Host your Application:  You can choose deployment systems like Vercel, Render for hosting. As you develop a single-page application 
Ensure that the page doesn't throw any error on reloading from any routes.  
Logged in User must not be redirected to Login on reloading any private route 



Main Requirements:   

Layout Structure

Navbar: Show the website logo and name (BookNook) on the left.
Links: Home, All Books, Add Book, My Books, My Borrows.
“Add Book”, “My Books” and “My Borrows” are private routes. Show them only when the user is logged in.
When the user is not logged in, show Login and Register buttons.
When the user is logged in, show the user photo. On click, show a dropdown with the user name, “My Profile” and a Logout button.
Footer: Show the logo, a short line about the website, contact info, social links, and a copyright line.
Show the Navbar and Footer on all pages.

Home

Banner / Slider: Make a slider with Swiper.js. Add a minimum of 3 slides. Each slide has a title, a short text and a “Browse Books” button. The button goes to the All Books page.
New Arrivals (Dynamic): Load the latest 6 books from the database and show them as cards.
Each card shows: Image, Title, Author, Category and a “View Details” button.
Show the newest books first (use sort and limit in MongoDB).
Add a “See All Books” button below the cards. It goes to the All Books page.
2 Extra Sections: Add 2 more static sections of your own idea. Example: “How Borrowing Works”, “Top Categories”, “Reader Reviews”.


Authentication

The user can go to the Login page from the Navbar. If a user who is not logged in tries to open a private route or clicks “Borrow”, send them to the Login page. After login, send them back to that page.
Note: Do all authentication in Next.js with BetterAuth and the MongoDB Adapter.
User Login
The user will show a Login page with a form, so that the user can Log in to this application. 
Show a Title for Login.  & Form with the following fields 
( Email, Password, Forget Password, Login button ) 

If the user logs in successfully, then 
navigate them to their desired Route / Home page.
If not, show him an error with a toast/error message anywhere in the form.

There will be some other options like 
Show the user a Link for Register so that he can go to the register page. 
Show users a Social Login Button ( Google only ) on clicking it 
The user authenticates with Google
 Navigate him to his desired Route / Home page.
 
User Registration
Create a register page with a form, so that the user can register themselves in this application. 
Show a Title for registration and a Form with the following fields
( Name, Email, Photo-URL, Password, & Register Button ) 

If the user registers successfully, then 
navigate them to their Login  page.
If not, show him an error with a toast/error message anywhere in the form.

Implement password validation
For password validation, you need to follow the criteria below. Show a password error in the form, and don't Register for an invalid password
Must have an Uppercase letter in the password 
Must have a Lowercase letter in the password  
Length must be at least 6 characters 


There will be some other options like 
Show the user a Link for Login so that he can go to the Login page. 
Show users a Social Login Button ( Google only ) on clicking it 
The user authenticates with Google
 Navigate the user to the Home page.

 💡Don’t implement email verification or the forget password method, as it will inconvenience the examiner. If you want, you can add these after receiving the assignment result.

CRUD Operation: 

Store all data in the MongoDB Database. Use imgbb or postimage to upload the book image. Use a toast to show all success and error messages.

Add Book (Create) — Private Route: /add-book
Make a form to add a new book. The form has these fields:
Book Title
Author Name
Category (select box: Fiction, Science, History, Kids, Others)
Book Image (upload to imgbb / postimage)
Short Description
User Name and Email (read-only, take them from the logged in user)
“Add Book” button
On submit, save the book in the database. Also save the date it was added. Show a success toast.

All Books (Read) — Public Route: /books
Show all books as cards in a grid (3 cards per row on desktop).
Each card shows: Image, Title, Author, Category and a “View Details” button.

Book Details (Read) — Private Route: /books/:id
Show all the information of the book: Image, Title, Author, Category, Description, and who added it.
Show a “Borrow This Book” button. (See the Borrow System below.)

My Books (Update & Delete) — Private Route: /my-books
Show only the books that the logged in user added. Show them in a table or as cards.
Update: Each book has an “Edit” button. It opens a form with the old data already filled in. The user can change the data and save it. Show a success toast.
Delete: Each book has a “Delete” button. Before you delete, show a confirm modal (not the default browser confirm). Then remove the book from the UI and the database.

Borrow System — Private Route: /my-borrows
Borrow: On the Book Details page, the “Borrow This Book” button opens a modal with a form:
User Name and Email (read-only)
“Confirm Borrow” button
On submit, save the borrow data in a new “borrows” collection: Book ID, Book Title, Book Image, User Email, Borrow Date, Return Date.
My Borrows: Show all books that the logged in user borrowed, in a table: Image, Title, Borrow Date, Return Date and a “Return Book” button. 

Server API & Token Check

Make the server with Express JS and MongoDB. You need only these 8 API routes:
GET /books — get all books (public)
GET /books/:id — get one book
POST /books — add a book
PATCH /books/:id — update a book
DELETE /books/:id — delete a book
POST /borrows — borrow a book
GET /borrows — get the borrows of the logged in user
DELETE /borrows/:id — return a book


Other Requirements 

Loading: Show a loading spinner while data is loading.
Not Found Page: Make a custom 404 page with a “Back to Home” button.
Page Title: Change the page title on each route. Example: “BookNook | All Books”.



UI Design Requirements: 

Unique Design: First, decide what kind of website you want to make. Then, search online or check out websites like ThemeForest to get ideas for the design. But remember, your website idea shouldn't be similar to any projects you've done before or to any examples in our modules or conceptual sessions.
You can also look for free resources on blogs to help with your website. 

Keep the main heading style (font, size, color) consistent across all sections.

Keep paragraph spacing balanced and text easily readable.
Maintain uniform image sizes and spacing.
     4.   Use the same button style as on the home page.
Ensure good spacing and proper alignment.
Navbar, Keep the heading/logo same style and size as on the home page.
Use a grid layout with equal image sizes.
Keep all cards equal height and width (especially in services, projects, or products section)
Use the new X logo instead of the old Twitter bird to match the latest rebrand
Responsiveness: Make it responsive for all devices, including mobile, tablet, and desktop views. 
Resources: 
https://uiverse.io/ 
https://devmeetsdevs.com/ 
https://bootcamp.uxdesign.cc/free-images-and-resources-collection-for-website-c77f2fc46ce5 
https://themeforest.net/?srsltid=AfmBOopTj6PNz51iuV2YJXUtBP8nt19_zT5LG2dToAjIHQqzNCzregn0 
https://codecanyon.net/?srsltid=AfmBOooRoUfeK7lOROpchCuA4hPVj5P9WRmtDQJ9K0E6Yhf4VTrHhXKt 

Challenges 
Available Copies: Add a “Total Copies” field in the Add Book form. When a user borrows a book, decrease the copies by 1 with $inc. When the user returns it, increase it by 1. If the copies are 0, disable the Borrow button and show “Not Available”.
No Double Borrow: A user cannot borrow the same book two times at the same time. If they try, show an error toast.
JWT: You must implement JWT validation to make APIs protected where needed. 

Optional Requirement Guideline 
Dark / Light Theme: Add a button in the Navbar to change the theme.
Animation: Add simple animation with Framer Motion or AOS.

Tech Stack: 
FrontEnd: 
Next JS(APP Router) 
Hero UI/Daisy UI/ ShadCn UI 
TypeScript/ JavaScript 

Authentication & Authorization: 
BetterAuth 
MongoDB Adapter 
JWT

Backend: 
Express JS 
MongoDB 
TypeScript( If you have enough Knowledge)/ JavaScript


What to submit:

Your client-side code GitHub repository
Your server-side code GitHub repository
Your live website link

B14-A8-Cat_Ron

B14-A8-RON.mp4
BookNook – A Small Online Library
Project Theme
BookNook is a small online library. Users can see all books, add new books, and borrow a book for a few days. Users can see the books they borrowed and return them. Simple idea: “Add a book, borrow a book, return a book.”

Key Rules: 
GitHub Commits: 
Include a minimum of 15 notable GitHub commits on the client side.
Include a minimum of 8 notable GitHub commits on the server side 
Readme.md: Add a meaningful readme.md file with the name of your website and a live site URL on client side. Include a minimum of five bullet points to feature your website.  
Lorem Text: Don’t use any Lorem ipsum text; you can not use the default alert to show any error or success message.
Host your Application:  You can choose deployment systems like Vercel, Render for hosting. As you develop a single-page application 
Ensure that the page doesn't throw any error on reloading from any routes.  
Logged in User must not be redirected to Login on reloading any private route 



Main Requirements:   

Layout Structure

Navbar: Show the website logo and name (BookNook) on the left.
Links: Home, All Books, Add Book, My Books, My Borrows.
“Add Book”, “My Books” and “My Borrows” are private routes. Show them only when the user is logged in.
When the user is not logged in, show Login and Register buttons.
When the user is logged in, show the user photo. On click, show a dropdown with the user name, “My Profile” and a Logout button.
Footer: Show the logo, a short line about the website, contact info, social links, and a copyright line.
Show the Navbar and Footer on all pages.

Home

Banner / Slider: Make a slider with Swiper.js. Add a minimum of 3 slides. Each slide has a title, a short text and a “Browse Books” button. The button goes to the All Books page.
New Arrivals (Dynamic): Load the latest 6 books from the database and show them as cards.
Each card shows: Image, Title, Author, Category and a “View Details” button.
Show the newest books first (use sort and limit in MongoDB).
Add a “See All Books” button below the cards. It goes to the All Books page.
2 Extra Sections: Add 2 more static sections of your own idea. Example: “How Borrowing Works”, “Top Categories”, “Reader Reviews”.


Authentication

The user can go to the Login page from the Navbar. If a user who is not logged in tries to open a private route or clicks “Borrow”, send them to the Login page. After login, send them back to that page.
Note: Do all authentication in Next.js with BetterAuth and the MongoDB Adapter.
User Login
The user will show a Login page with a form, so that the user can Log in to this application. 
Show a Title for Login.  & Form with the following fields 
( Email, Password, Forget Password, Login button ) 

If the user logs in successfully, then 
navigate them to their desired Route / Home page.
If not, show him an error with a toast/error message anywhere in the form.

There will be some other options like 
Show the user a Link for Register so that he can go to the register page. 
Show users a Social Login Button ( Google only ) on clicking it 
The user authenticates with Google
 Navigate him to his desired Route / Home page.
 
User Registration
Create a register page with a form, so that the user can register themselves in this application. 
Show a Title for registration and a Form with the following fields
( Name, Email, Photo-URL, Password, & Register Button ) 

If the user registers successfully, then 
navigate them to their Login  page.
If not, show him an error with a toast/error message anywhere in the form.

Implement password validation
For password validation, you need to follow the criteria below. Show a password error in the form, and don't Register for an invalid password
Must have an Uppercase letter in the password 
Must have a Lowercase letter in the password  
Length must be at least 6 characters 


There will be some other options like 
Show the user a Link for Login so that he can go to the Login page. 
Show users a Social Login Button ( Google only ) on clicking it 
The user authenticates with Google
 Navigate the user to the Home page.

 💡Don’t implement email verification or the forget password method, as it will inconvenience the examiner. If you want, you can add these after receiving the assignment result.

CRUD Operation: 

Store all data in the MongoDB Database. Use imgbb or postimage to upload the book image. Use a toast to show all success and error messages.

Add Book (Create) — Private Route: /add-book
Make a form to add a new book. The form has these fields:
Book Title
Author Name
Category (select box: Fiction, Science, History, Kids, Others)
Book Image (upload to imgbb / postimage)
Short Description
User Name and Email (read-only, take them from the logged in user)
“Add Book” button
On submit, save the book in the database. Also save the date it was added. Show a success toast.

All Books (Read) — Public Route: /books
Show all books as cards in a grid (3 cards per row on desktop).
Each card shows: Image, Title, Author, Category and a “View Details” button.

Book Details (Read) — Private Route: /books/:id
Show all the information of the book: Image, Title, Author, Category, Description, and who added it.
Show a “Borrow This Book” button. (See the Borrow System below.)

My Books (Update & Delete) — Private Route: /my-books
Show only the books that the logged in user added. Show them in a table or as cards.
Update: Each book has an “Edit” button. It opens a form with the old data already filled in. The user can change the data and save it. Show a success toast.
Delete: Each book has a “Delete” button. Before you delete, show a confirm modal (not the default browser confirm). Then remove the book from the UI and the database.

Borrow System — Private Route: /my-borrows
Borrow: On the Book Details page, the “Borrow This Book” button opens a modal with a form:
User Name and Email (read-only)
“Confirm Borrow” button
On submit, save the borrow data in a new “borrows” collection: Book ID, Book Title, Book Image, User Email, Borrow Date, Return Date.
My Borrows: Show all books that the logged in user borrowed, in a table: Image, Title, Borrow Date, Return Date and a “Return Book” button. 

Server API & Token Check

Make the server with Express JS and MongoDB. You need only these 8 API routes:
GET /books — get all books (public)
GET /books/:id — get one book
POST /books — add a book
PATCH /books/:id — update a book
DELETE /books/:id — delete a book
POST /borrows — borrow a book
GET /borrows — get the borrows of the logged in user
DELETE /borrows/:id — return a book


Other Requirements 

Loading: Show a loading spinner while data is loading.
Not Found Page: Make a custom 404 page with a “Back to Home” button.
Page Title: Change the page title on each route. Example: “BookNook | All Books”.



UI Design Requirements: 

Unique Design: First, decide what kind of website you want to make. Then, search online or check out websites like ThemeForest to get ideas for the design. But remember, your website idea shouldn't be similar to any projects you've done before or to any examples in our modules or conceptual sessions.
You can also look for free resources on blogs to help with your website. 

Keep the main heading style (font, size, color) consistent across all sections.

Keep paragraph spacing balanced and text easily readable.
Maintain uniform image sizes and spacing.
     4.   Use the same button style as on the home page.
Ensure good spacing and proper alignment.
Navbar, Keep the heading/logo same style and size as on the home page.
Use a grid layout with equal image sizes.
Keep all cards equal height and width (especially in services, projects, or products section)
Use the new X logo instead of the old Twitter bird to match the latest rebrand
Responsiveness: Make it responsive for all devices, including mobile, tablet, and desktop views. 
Resources: 
https://uiverse.io/ 
https://devmeetsdevs.com/ 
https://bootcamp.uxdesign.cc/free-images-and-resources-collection-for-website-c77f2fc46ce5 
https://themeforest.net/?srsltid=AfmBOopTj6PNz51iuV2YJXUtBP8nt19_zT5LG2dToAjIHQqzNCzregn0 
https://codecanyon.net/?srsltid=AfmBOooRoUfeK7lOROpchCuA4hPVj5P9WRmtDQJ9K0E6Yhf4VTrHhXKt 

Challenges 
Available Copies: Add a “Total Copies” field in the Add Book form. When a user borrows a book, decrease the copies by 1 with $inc. When the user returns it, increase it by 1. If the copies are 0, disable the Borrow button and show “Not Available”.
No Double Borrow: A user cannot borrow the same book two times at the same time. If they try, show an error toast.
JWT: You must implement JWT validation to make APIs protected where needed. 

Optional Requirement Guideline 
Dark / Light Theme: Add a button in the Navbar to change the theme.
Animation: Add simple animation with Framer Motion or AOS.

Tech Stack: 
FrontEnd: 
Next JS(APP Router) 
Hero UI/Daisy UI/ ShadCn UI 
TypeScript/ JavaScript 

Authentication & Authorization: 
BetterAuth 
MongoDB Adapter 
JWT

Backend: 
Express JS 
MongoDB 
TypeScript( If you have enough Knowledge)/ JavaScript


What to submit:

Your client-side code GitHub repository
Your server-side code GitHub repository
Your live website link

