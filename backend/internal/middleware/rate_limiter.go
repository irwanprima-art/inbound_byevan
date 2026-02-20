package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// LoginRateLimiter limits login attempts per IP address
type LoginRateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	max      int           // max attempts
	window   time.Duration // time window
}

// NewLoginRateLimiter creates a rate limiter (e.g., 5 attempts per minute)
func NewLoginRateLimiter(maxAttempts int, window time.Duration) *LoginRateLimiter {
	rl := &LoginRateLimiter{
		attempts: make(map[string][]time.Time),
		max:      maxAttempts,
		window:   window,
	}
	// Cleanup old entries every 5 minutes
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			rl.cleanup()
		}
	}()
	return rl
}

// Middleware returns a Gin middleware handler
func (rl *LoginRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		rl.mu.Lock()
		now := time.Now()

		// Filter out expired attempts
		valid := make([]time.Time, 0)
		for _, t := range rl.attempts[ip] {
			if now.Sub(t) < rl.window {
				valid = append(valid, t)
			}
		}
		rl.attempts[ip] = valid

		if len(valid) >= rl.max {
			rl.mu.Unlock()
			retryAfter := rl.window - now.Sub(valid[0])
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Terlalu banyak percobaan login. Silakan coba lagi nanti.",
				"retry_after": int(retryAfter.Seconds()),
			})
			return
		}

		rl.attempts[ip] = append(rl.attempts[ip], now)
		rl.mu.Unlock()

		c.Next()
	}
}

// cleanup removes expired entries from the map
func (rl *LoginRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	for ip, times := range rl.attempts {
		valid := make([]time.Time, 0)
		for _, t := range times {
			if now.Sub(t) < rl.window {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.attempts, ip)
		} else {
			rl.attempts[ip] = valid
		}
	}
}
