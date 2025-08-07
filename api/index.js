module.exports = (req, res) => {
  res.json({ 
    message: 'API DROLE fonctionne !', 
    timestamp: new Date().toISOString(),
    status: 'success'
  });
}; 