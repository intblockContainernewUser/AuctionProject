// detail.js - Item detail page & bidding logic
// 3号成员负责的核心功能：
// - 出价逻辑（验证价格）
// - 更新当前价格
// - 倒计时功能（可选）
// - 出价历史更新

console.log("Item detail page loaded");

// Configuration
const USE_SERVER = true; // Set to false to use local data.js only
const API_URL = '/api';
const REFRESH_INTERVAL = 3000; // 3 seconds

let currentItem = null;
let refreshTimer = null;

// User mapping
const USER_MAP = {
    '1001': 'Andy',
    '1002': 'Bob',
    '1003': 'Cathy'
};

let currentUser = null; // Display name (Andy/Bob/Cathy)
let currentUserId = null; // User ID (1001/1002/1003)

// Get item ID from URL parameter
function getItemIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return parseInt(urlParams.get('id')) || 1; // Default to item 1
}

// Get current user from URL parameter
function getCurrentUser() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');

    if (userId && USER_MAP[userId]) {
        currentUserId = userId;
        currentUser = USER_MAP[userId];
        return currentUser;
    }

    // If no user in URL, try to get from localStorage
    const storedUserId = localStorage.getItem('currentUserId');
    const storedUser = localStorage.getItem('currentUser');

    if (storedUserId && storedUser) {
        currentUserId = storedUserId;
        currentUser = storedUser;
        return storedUser;
    }

    // Fallback: prompt for name
    currentUserId = null;
    currentUser = null;
    return null;
}

// Display current user in the page
function displayCurrentUser() {
    currentUser = getCurrentUser();

    // Create user display element if it doesn't exist
    let userDisplay = document.getElementById('currentUserDisplay');
    if (!userDisplay) {
        userDisplay = document.createElement('div');
        userDisplay.id = 'currentUserDisplay';
        userDisplay.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 8px 15px; border-radius: 20px; font-size: 14px; z-index: 1000;';
        document.body.appendChild(userDisplay);
    }

    if (currentUser) {
        userDisplay.textContent = `👤 ${currentUser}`;
        userDisplay.style.display = 'block';
    } else {
        userDisplay.style.display = 'none';
    }
}

// Load item data from server
async function loadItemData() {
    const itemId = getItemIdFromURL();

    if (USE_SERVER) {
        try {
            const response = await fetch(`${API_URL}/items/${itemId}`);
            const data = await response.json();
            currentItem = data.item;
        } catch (error) {
            console.log('Server not available, using local data');
            // 降级使用本地数据（假设全局有 items 数组）
            currentItem = items.find(item => item.id === itemId);
        }
    } else {
        currentItem = items.find(item => item.id === itemId);
    }

    if (currentItem) {
        updatePageContent();
    }
}

// Update page content with item data
function updatePageContent() {
    document.getElementById('itemTitle').textContent = currentItem.name;
    document.getElementById('itemDescription').textContent = currentItem.description;
    document.getElementById('itemImage').src = currentItem.image;
    document.getElementById('startingPrice').textContent = `$${currentItem.startingPrice}`;
    document.getElementById('currentPrice').textContent = `$${currentItem.currentPrice}`;

    // Update time remaining (simplified)
    const hours = Math.floor(currentItem.timeLeft / 3600);
    const minutes = Math.floor((currentItem.timeLeft % 3600) / 60);
    document.getElementById('timeRemaining').textContent = `${hours}h ${minutes}m`;

    // Update bid history
    if (currentItem.bidHistory) {
        const historyList = document.getElementById('bidHistoryList');
        historyList.innerHTML = '';
        currentItem.bidHistory.forEach(bid => {
            // Map user ID to display name
            const displayName = USER_MAP[bid.bidder] || bid.bidder;

            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span class="bidder">${displayName}</span>
                <span class="bid-amount">$${bid.amount}</span>
            `;
            historyList.appendChild(li);
        });
    }
}

// Place a bid
async function placeBid() {
    const bidInput = document.getElementById('bidInput');
    const bidAmount = parseInt(bidInput.value);
    const messageElement = document.getElementById('bidMessage');

    // Validation
    if (!bidAmount || bidAmount <= 0) {
        messageElement.textContent = 'Please enter a valid bid amount';
        messageElement.style.color = 'red';
        return;
    }

    if (bidAmount <= currentItem.currentPrice) {
        messageElement.textContent = `Bid must be higher than $${currentItem.currentPrice}`;
        messageElement.style.color = 'red';
        return;
    }

    // Get bidder ID from current user or prompt
    let bidderId = currentUserId;
    if (!bidderId) {
        const bidderName = prompt('Enter your name:');
        if (bidderName) {
            // Store name-based user (fallback for manual entry)
            localStorage.setItem('currentUser', bidderName);
            currentUser = bidderName;
            bidderId = bidderName; // Use name as ID if no user ID
            displayCurrentUser();
        } else {
            bidderId = 'Anonymous';
        }
    }

    if (USE_SERVER) {
        try {
            const response = await fetch(`${API_URL}/bid`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itemId: currentItem.id,
                    amount: bidAmount,
                    bidder: bidderId  // Send user ID instead of name
                })
            });

            const result = await response.json();

            if (result.success) {
                messageElement.textContent = 'Bid placed successfully! 🎉';
                messageElement.style.color = 'green';
                bidInput.value = '';

                // Refresh data immediately
                await loadItemData();
            } else {
                messageElement.textContent = result.message;
                messageElement.style.color = 'red';
            }
        } catch (error) {
            messageElement.textContent = 'Server error, please try again';
            messageElement.style.color = 'red';
        }
    } else {
        // Local mode (no server)
        currentItem.currentPrice = bidAmount;
        currentItem.bidHistory.unshift({
            bidder: bidderId,  // Store user ID
            amount: bidAmount,
            time: new Date().toLocaleString()
        });
        updatePageContent();
        messageElement.textContent = 'Bid placed successfully! 🎉';
        messageElement.style.color = 'green';
        bidInput.value = '';
    }
}

// Auto-refresh data
function startAutoRefresh() {
    if (USE_SERVER) {
        refreshTimer = setInterval(() => {
            loadItemData();
        }, REFRESH_INTERVAL);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    displayCurrentUser();
    loadItemData();
    startAutoRefresh();

    // Bind place bid button
    const placeBidBtn = document.getElementById('placeBidBtn');
    if (placeBidBtn) {
        placeBidBtn.addEventListener('click', placeBid);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});


CREATE TABLE items (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    startingPrice DECIMAL(10,2),
    currentPrice DECIMAL(10,2),
    timeLeft INT,
    image VARCHAR(500),
    category VARCHAR(100),
    version INT DEFAULT 0,
    INDEX idx_timeLeft (timeLeft)
) ENGINE=InnoDB;

CREATE TABLE bid_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    itemId INT NOT NULL,
    itemName VARCHAR(255),
    userId VARCHAR(50) NOT NULL,
    yourBid DECIMAL(10,2),
    currentBid DECIMAL(10,2),
    status ENUM('outbid','winning','won') DEFAULT 'outbid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_itemId (itemId)
) ENGINE=InnoDB;


module.exports = {
    db: {
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'auction',
        connectionLimit: 20
    }
};


const mysql = require('mysql2/promise');
const config = require('../config/config');

const pool = mysql.createPool(config.db);

module.exports = pool;



const pool = require('../db');

/**
 * 核心出价逻辑
 * @param {number} itemId 商品ID
 * @param {string} userId 用户ID
 * @param {number} bidAmount 出价金额
 */
async function placeBid(itemId, userId, bidAmount) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. 锁定商品行（悲观锁）
        const [items] = await connection.query(
            'SELECT id, name, currentPrice, timeLeft, version FROM items WHERE id = ? FOR UPDATE',
            [itemId]
        );
        if (items.length === 0) {
            throw new Error('Item not found');
        }
        const item = items[0];

        // 2. 检查拍卖是否结束
        if (item.timeLeft <= 0) {
            throw new Error('Auction has ended');
        }

        // 3. 验证出价是否高于当前价格
        if (bidAmount <= item.currentPrice) {
            throw new Error('Bid must be higher than current price');
        }

        // 4. 更新商品当前价格
        await connection.query(
            'UPDATE items SET currentPrice = ?, version = version + 1 WHERE id = ?',
            [bidAmount, itemId]
        );

        // 5. 将之前的 winning 出价标记为 outbid
        await connection.query(
            `UPDATE bid_history SET status = 'outbid' 
             WHERE itemId = ? AND status = 'winning'`,
            [itemId]
        );

        // 6. 插入新的出价记录（状态为 winning）
        await connection.query(
            `INSERT INTO bid_history (itemId, itemName, userId, yourBid, currentBid, status)
             VALUES (?, ?, ?, ?, ?, 'winning')`,
            [itemId, item.name, userId, bidAmount, bidAmount]
        );

        await connection.commit();
        return { success: true, currentPrice: bidAmount };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * 获取单个商品详情（含出价历史）
 */
async function getItemDetail(itemId) {
    const [items] = await pool.query(
        `SELECT id, name, description, startingPrice, currentPrice, timeLeft, image, category 
         FROM items WHERE id = ?`,
        [itemId]
    );
    if (items.length === 0) return null;

    const item = items[0];
    const [history] = await pool.query(
        `SELECT userId as bidder, yourBid as amount, created_at as time 
         FROM bid_history WHERE itemId = ? ORDER BY created_at DESC`,
        [itemId]
    );
    item.bidHistory = history;
    return item;
}

module.exports = { placeBid, getItemDetail };



const bidService = require('../services/bidService');

// 获取商品详情
exports.getItem = async (req, res) => {
    const { id } = req.params;
    try {
        const item = await bidService.getItemDetail(parseInt(id));
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json({ success: true, item });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 处理出价
exports.placeBid = async (req, res) => {
    const { itemId, amount, bidder } = req.body;
    
    // 基本校验
    if (!itemId || !amount || !bidder || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }

    try {
        const result = await bidService.placeBid(itemId, bidder, amount);
        res.json({ success: true, currentPrice: result.currentPrice, message: 'Bid placed successfully' });
    } catch (error) {
        let status = 400;
        if (error.message === 'Item not found') status = 404;
        else if (error.message.includes('Auction ended') || error.message.includes('Bid must be higher')) status = 400;
        else status = 500;
        res.status(status).json({ success: false, message: error.message });
    }
};



const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bidController');

// 获取商品详情
router.get('/items/:id', bidController.getItem);

// 提交出价
router.post('/bid', bidController.placeBid);

module.exports = router;



const express = require('express');
const path = require('path');
const bidRoutes = require('./routes/bidRoutes');
const app = express();

app.use(express.json());
app.use('/api', bidRoutes);

// 提供前端静态文件（可选）
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


cd backend
npm install express mysql2

node app.js
