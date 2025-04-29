const express = require('express');
const app = express();
const mongoose = require('mongoose');
app.use(express.static('public'));

mongoose.connect('mongodb://mongodb/DailyFlow')
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.log("MongoDB connection error: " + err);
  });

var mySchema = new mongoose.Schema({
  Date: String,
  Flow: String,
  Local: Number,
  Mainland: Number,
  Others: Number,
}, { versionKey: false });

const Daylog = mongoose.model('Daylog', mySchema, 'daylog');

app.get('/data', async (req, res) => {
  try {
    const data = await Daylog.find({},{ _id: 0 });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Experiencing database error!!');
  }
});

app.get('/HKPassenger/v1/data/:year/:month/:day', async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const numDays = req.query.num;
    const yearNum=parseInt(year);
    const monthNum=parseInt(month);
    const dayNum=parseInt(day);
    if (isNaN(yearNum) || yearNum < 2021 || yearNum > 2025) {
      return res.status(400).json({
        error: 'Wrong year input - must be a number between 2021 - 2025.'
      });
    }
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        error: 'Wrong month input - must be a number between 1 - 12.'
      });
    }
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return res.status(400).json({
        error: 'Wrong date input - must be a number between 1 - 31.'
      });
    }

    if (parseInt(numDays) < 1 || (numDays!==undefined && isNaN(numDays))) {
      return res.status(400).json({
        error: '"Wrong query string num - must be a number greater than zero.'
      });
    }

    const inputDate = new Date(yearNum, monthNum - 1, dayNum);
    if (isNaN(inputDate.getTime()) ||
      inputDate.getFullYear()!== yearNum ||
      inputDate.getMonth()!== monthNum - 1 ||
      inputDate.getDate()!== dayNum) {
      const invalidDateStr = `${day}/${month}/${year}`;
      return res.status(400).json({
        error: `${invalidDateStr} is not a valid calendar date!`
      });
    }

    if (numDays===undefined) {
      const targetDate = `${month}/${day}/${year}`;
      const data = await Daylog.find({ Date: targetDate },{ _id: 0 });

      if (data.length === 0) {
        return res.status(404).json({ message: 'No data found for the specified date.' });
      }

      res.json(data);
    } else {
      const startDate = new Date(`${year}-${month}-${day}`);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(numDays) - 1);
      const currDate = new Date(startDate);
      const allData = [];
      while (currDate <= endDate) {
        const currFormatted = formatDate(currDate);
        const data = await Daylog.find({ Date: currFormatted },{ _id: 0 });
        allData.push(...data);
        currDate.setDate(currDate.getDate() + 1);
      }

      res.json(allData);
    }
  } catch (error) {
    console.error('Error retrieving passenger flow data:', error);
    res.status(500).json({ message: 'Experiencing database error!!' });
  }
});

function formatDate(date) {
  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}


app.get('/HKPassenger/v1/aggregate/:group/:year/:month', async (req, res) => {
  try {
      const { group, year, month } = req.params;
      const validGroups = ['local','mainland', 'others', 'all'];

      if (!validGroups.includes(group)) {
        return res.status(400).json({
          error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}/${month}`
        });
      }

      const validYear = parseInt(year);
      if (isNaN(validYear)) {
        return res.status(400).json({
          error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}/${month}`
        });
      }
      const allData = [];
      
      if (month) {
          const validMonth = parseInt(month);
          if (isNaN(validMonth) || validMonth < 1 || validMonth > 12) {
            return res.status(400).json({
              error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}/${month}`
            });
          }
          const startDate = new Date(`${year}-${month}-01`);
          const endDate = new Date(year, validMonth, 0);
          const currDate = new Date(startDate);
          while (currDate <= endDate) {
            const currFormatted = formatDate(currDate);
            const data = await Daylog.find({ Date: currFormatted },{ _id: 0});
            allData.push(...data);
            currDate.setDate(currDate.getDate() + 1);
          }
      }
      const groupedData = {};
      allData.forEach(item => {
          if (!groupedData[item.Date]) {
              groupedData[item.Date] = {
                  arrival: { Local: 0, Mainland: 0, Others: 0 },
                  departure: { Local: 0, Mainland: 0, Others: 0 }
              };
          }
          if (item.Flow === 'Arrival') {
              groupedData[item.Date].arrival.Local += item.Local;
              groupedData[item.Date].arrival.Mainland += item.Mainland;
              groupedData[item.Date].arrival.Others += item.Others;
          } else if (item.Flow === 'Departure') {
              groupedData[item.Date].departure.Local += item.Local;
              groupedData[item.Date].departure.Mainland += item.Mainland;
              groupedData[item.Date].departure.Others += item.Others;
          }
      });

      const result = [];
      for (const date in groupedData) {
          const arrival = groupedData[date].arrival;
          const departure = groupedData[date].departure;
          if(group==='local'){
            result.push({
                Date: date,
                Local: arrival.Local - departure.Local,
            });
          }else if(group==='mainland'){
            result.push({
              Date: date,
              Mainland: arrival.Mainland - departure.Mainland,
            });
          }else if(group==='others'){
            result.push({
              Date: date,
              Others: arrival.Others - departure.Others
            });
          }else{
            result.push({
              Date: date,
              Local: arrival.Local - departure.Local,
              Mainland: arrival.Mainland - departure.Mainland,
              Others: arrival.Others - departure.Others,
              Total:(arrival.Local - departure.Local)+(arrival.Mainland - departure.Mainland)+(arrival.Others - departure.Others)
            });
          }
      }

      res.json(result);
  } catch (err) {
      console.error(err);
      res.status(500).send('Experiencing database error!!');
  }
});    

app.get('/HKPassenger/v1/aggregate/:group/:year', async (req, res) => {
  try {
      const { group, year} = req.params;
      const validGroups = ['local','mainland', 'others', 'all'];

      if (!validGroups.includes(group)) {
        return res.status(400).json({
          error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}`
        });
      }

      const validYear = parseInt(year);
      if (isNaN(validYear)) {
        return res.status(400).json({
          error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}`
        });
      }
      const allData = [];
      
      if (year) {
          const validYear = parseInt(year);
          if (isNaN(validYear) || validYear < 2021 || validYear > 2025) {
            return res.status(400).json({
              error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}`
            });
          }
          const startDate = new Date(`${year}-01-01`);
          const endDate = new Date(`${year}-12-31`);
          const currDate = new Date(startDate);
          while (currDate <= endDate) {
            const currFormatted = formatDate(currDate);
            const data = await Daylog.find({ Date: currFormatted },{ _id: 0});
            allData.push(...data);
            currDate.setDate(currDate.getDate() + 1);
          }
      }
      const groupedData = {};
      allData.forEach(item => {
          if (!groupedData[item.Date]) {
              groupedData[item.Date] = {
                  arrival: { Local: 0, Mainland: 0, Others: 0 },
                  departure: { Local: 0, Mainland: 0, Others: 0 }
              };
          }
          if (item.Flow === 'Arrival') {
              groupedData[item.Date].arrival.Local += item.Local;
              groupedData[item.Date].arrival.Mainland += item.Mainland;
              groupedData[item.Date].arrival.Others += item.Others;
          } else if (item.Flow === 'Departure') {
              groupedData[item.Date].departure.Local += item.Local;
              groupedData[item.Date].departure.Mainland += item.Mainland;
              groupedData[item.Date].departure.Others += item.Others;
          }
      });
      const monthlyData = {};
      for (const date in groupedData) {
          const [month, day, year]  = date.split('/');
          const Keys = `${month}/${year}`;

          if (!monthlyData[Keys]) {
              monthlyData[Keys] = {
                  arrival: { Local: 0, Mainland: 0, Others: 0 },
                  departure: { Local: 0, Mainland: 0, Others: 0 }
              };
          }
          monthlyData[Keys].arrival.Local += groupedData[date].arrival.Local;
          monthlyData[Keys].arrival.Mainland += groupedData[date].arrival.Mainland;
          monthlyData[Keys].arrival.Others += groupedData[date].arrival.Others;
          monthlyData[Keys].arrival.Local -= groupedData[date].departure.Local;
          monthlyData[Keys].arrival.Mainland -= groupedData[date].departure.Mainland;
          monthlyData[Keys].arrival.Others -= groupedData[date].departure.Others;
      }
      const result = [];
      for (const date in monthlyData) {
          if(group==='local'){
            result.push({
                Month: date,
                Local: monthlyData[date].arrival.Local,
            });
          }else if(group==='mainland'){
            result.push({
              Month: date,
              Mainland: monthlyData[date].arrival.Mainland,
            });
          }else if(group==='others'){
            result.push({
              Month: date,
              Others: monthlyData[date].arrival.Others,
            });
          }else{
            result.push({
              Month: date,
              Local: monthlyData[date].arrival.Local,
              Mainland: monthlyData[date].arrival.Mainland,
              Others: monthlyData[date].arrival.Others,
              Total:(monthlyData[date].arrival.Local)+(monthlyData[date].arrival.Mainland)+(monthlyData[date].arrival.Others)
            });
          }
      }

      res.json(result);
  } catch (err) {
      console.error(err);
      res.status(500).send('Experiencing database error!!');
  }
});   

app.use(express.json()); 
app.post('/HKPassenger/v1/data/', async (req, res) => {
  const inputData = req.body;
  let status = {};
  try {
      for (const date in inputData) {
          if (!ValidDate(date)) {
              status[date] = 'Wrong date format or invalid date';
              continue;
          }
          const records = inputData[date];
          const existingRecords = await Daylog.find({ Date: date });

          if (existingRecords.length === 0) {
              const newRecords = records.map(record => ({
                  ...record,
                  Date: date
              }));
              await Daylog.insertMany(newRecords);
              status[date] = `Added ${records.length} records to the database`;
          } else {
              status[date] = 'Records existed; cannot override';
          }
      }
      if (Object.keys(status).length === 0) {
        return res.json({ "error": "POST request - missing data." });
    }
      res.json({ status });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Experiencing database error!!' });
  }
});

function ValidDate(dateStr) {
  const parts = dateStr.split('/');
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (month < 1 || month > 12) {
      return false;
  }
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((year % 4 === 0 && year % 100!== 0) || (year % 400 === 0)) {
      daysInMonth[1] = 29;
  }
  if (day < 1 || day > daysInMonth[month - 1]) {
      return false;
  }

  return true;
}

app.use((req, res) => {
  res.status(400).json({
      error: `Cannot ${req.method} ${req.originalUrl}`
  });
});


app.listen(8080, () => {
  console.log('ASS4 App listening on port 8080!');
});