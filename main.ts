import { PrismaClient, User } from '@prisma/client';
import express from 'express';
import jwt, { VerifyOptions, sign } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.set('views', path.resolve("./static"));
app.set('view engine', 'html');

app.engine('html', (filePath, options, callback) => { // define the template engine
  fs.readFile(filePath, (err, content) => {
    if (err) return callback(err)

    const rendered = content.toString()

    return callback(null, rendered)
  })
})

function verifyJWT() {
 return (req: Request, res: Response, next: NextFunction) => {

  
  const token = req.headers.authorization;
  
  if(!token) {
   return res.status(406).json({
    auth: false,
    description: "not found token authorization"
   })
  }
  
  jwt.verify(token, process.env.SECRET || "", (err, decode) => {
   if(err) {
    return res.status(404).json({
     auth: false,
     description: "error user not auth"
    })
   } else {

    next();
   }
  })
 }
 }
 
 app.get("/", (req, res) => {
  res.render("home");
});

app.get("/private", verifyJWT(), async (req, res) => {
  const token = req.headers.authorization;

  if(token)  {
    jwt.verify(token, process.env.SECRET || "", async (err, decode) => {
      if(err) {
        return res.status(407).json({
          auth: false,
          description: err.cause
        });
      } else {
        const id = decode?.toString();

        if(id) {
          const user = await prisma.user.findUnique({

            where: {
               id: id,

            },

          });
          return res.status(200).json({
            auth: true,
            payload: {
              email: user?.email,
              name: user?.name,
            }
          })
        } else {
          return res.status(400).json({
            auth: false,
            description: "error server"
          })
        }
      }
    })
  } else {
    return res.status(404).json({
      auth: false,
      description: "token is required"
    })
  }
})

app.post("/sign", async (req, res) => {
  let body = req.body as User;

  if(!body.email || !body.password) {
    return res.status(404).json({
      auth: false,
      description: "email and password is required"
    })
  };



  let exist = await prisma.user.findUnique({
    where: {
      email: body.email
    }
  })

  if(exist) {
    return res.status(404).json({
      auth: false,
      description: "user exist"
    });
  }

  let user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name ? body.name : "default",
      password: body.password
    }
  });

  let payload = {
    IDENTIFIER: user.id,
  }
  let token = sign(payload, process.env.SECRET || "", {
    expiresIn: "1h",
  });

  return res.status(200).json({
    auth: true,
    data: user,
    token: token
  });
})

app.post("/login", async (req, res) => {
  const body = req.body as User;

  if(!body.email || !body.password) {
    return res.status(406).json({
      auth: false,
      description: "email or password incorrect"
    })
  };

   const user = await prisma.user.findFirstOrThrow({
    where: {
      email: body.email,
      password: body.password
    }
   });

   if(!user) {
    return res.status(406).json({
      auth: false,
      description: "user not found"
    })
   };

   const token = jwt.sign(user.id, process.env.SECRET || "");

   res.status(200).json({
    auth: true,
    token: token
   })

});




app.listen(8000, () => {
 console.log("app listen in https://localhost:" + 8000)
});
