const axios = require('axios');

const verifyTokenWithCookies = async (req, res, next) => {
    try {
        // Add request path to the authentication request
        const requestPath = req.originalUrl;
        console.log('Checking path:', requestPath);
        // 2. Forward cookies in the axios request headers 
        const response = await axios.post(process.env.SERVICE_AUTH_URL,
            { path: requestPath },  // Send path in request body
            {
                headers: {
                    Cookie: req.headers.cookie // Forward the raw cookie header
                },
                withCredentials: true
            }
        );
        console.log("Response from authentication service", response.data);
        if (response.data.EC === 0) {
            // Store user info from auth service if needed
            req.user = response.data.DT;
            console.log("Authentication success");
            return next();
        } else {
            console.log("Authentication failed");
            return res.status(403).json({
                EC: 1,
                EM: "Authentication failed",
                DT: null
            });
        }

    } catch (error) {
        console.error("Auth error details:", error.response?.data || error.message);
        return res.status(403).json({
            EC: error.response?.data.EC,
            EM: error.response?.data.EM,
            DT: error.response?.data.DT
        });
    }
};

const verifyToken = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                EC: 1,
                EM: "Không tìm thấy token xác thực",
                DT: null
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Add request path to the authentication request
        const requestPath = req.originalUrl;
        console.log('Checking path:', requestPath);
        
        // Gửi token đến service xác thực
        const response = await axios.post(process.env.SERVICE_AUTH_URL,
            { path: requestPath },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        
        console.log("Response from authentication service", response.data);
        if (response.data.EC === 0) {
            // Store user info from auth service if needed
            req.user = response.data.DT;
            console.log("Authentication success");
            return next();
        } else {
            console.log("Authentication failed");
            return res.status(403).json({
                EC: 1,
                EM: "Authentication failed",
                DT: null
            });
        }

    } catch (error) {
        console.error("Auth error details:", error.response?.data || error.message);
        return res.status(403).json({
            EC: error.response?.data.EC || 1,
            EM: error.response?.data.EM || "Lỗi xác thực",
            DT: error.response?.data.DT || null
        });
    }
};

module.exports = { verifyTokenWithCookies, verifyToken };
