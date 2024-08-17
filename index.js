import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "1234",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = -1;
let color;
const deafult_color = 'grey';

var users = [];

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  console.log(countries);
  users = await getUsers();
  color = await getColor();
  res.render("index.ejs", {
    countries: countries,
    length: countries.length,
    users: users,
    color: color
  });
});

app.post("/add", async (req, res) => {
  if (currentUserId === -1) {
    res.render("index.ejs", {
      countries: [],
      length: 0,
      users: users,
      color: deafult_color,
      error: "No user selected!"
    });
  }
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      const countries = await checkVisisted();
      // color = await getColor();
      res.render("index.ejs", {
        users: users,
        color: color,
        countries: countries,
        length: countries.length,
        error: "Country has already been added, try again.",
      });
    }
  } catch (err) {
    console.log(err);
    const countries = await checkVisisted();
    res.render("index.ejs", {
      users: users,
      color: color,
      countries: countries,
      length: countries.length,
      error: "Country name does not exist, try again.",
    });
  }
});

app.post("/user", async (req, res) => {
  // condition for new user
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html

  const user_name = req.body.name;
  const color = req.body.color;

  try {
    await db.query("INSERT INTO users (name, color) VALUES ($1, $2)", [user_name, color]);
  } catch (err) {
    console.log(err);
  }
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

async function getUsers() {
  try {
    const result = await db.query("SELECT * FROM users");
    return result.rows;
  } catch (error) {
    console.log("Error in getting users: ", error);
  }
}

async function checkVisisted() {
  if (currentUserId === -1)
    return [];
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getColor() {
  if (currentUserId === -1)
    return deafult_color;
  let color;
  try {
    const result = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);
    color = result.rows[0].color;
  } catch (err) {
    console.log(err);
  }
  return color || deafult_color;
}