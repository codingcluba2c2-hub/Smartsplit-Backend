require('dotenv').config();
const dns=require('node:dns');
dns.setServers(['8.8.8.8','1.1.1.1']);
const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');

const token = jwt.sign({ id: '69e5af01496270ec87f75b3e' }, process.env.JWT_SECRET, { expiresIn: '30d' });

const fs = require('fs');
const out = [];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    out.push('Connected to ' + mongoose.connection.name);
    const res = await fetch('http://localhost:5000/api/admin/users', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.text();
    out.push('STATUS ' + res.status);
    out.push(data);
    fs.writeFileSync('tmpOutput.txt', out.join('\n'), 'utf8');
    process.exit(0);
  })
  .catch((err) => {
    out.push('ERROR ' + err.toString());
    fs.writeFileSync('tmpOutput.txt', out.join('\n'), 'utf8');
    process.exit(1);
  });
