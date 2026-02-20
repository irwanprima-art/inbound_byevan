package middleware

import (
	"log"
	"net"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// IPWhitelist returns a middleware that only allows requests from the specified
// CIDR ranges. The allowed CIDRs can be configured via the CLOCK_ALLOWED_CIDRS
// environment variable (comma-separated). Default: 192.168.4.0/24.
func IPWhitelist() gin.HandlerFunc {
	// Parse allowed CIDRs
	raw := os.Getenv("CLOCK_ALLOWED_CIDRS")
	if raw == "" {
		raw = "192.168.6.0/24,172.16.0.0/12,127.0.0.0/8"
	}
	var nets []*net.IPNet
	for _, cidr := range strings.Split(raw, ",") {
		cidr = strings.TrimSpace(cidr)
		if cidr == "" {
			continue
		}
		_, ipNet, err := net.ParseCIDR(cidr)
		if err != nil {
			log.Printf("[IP-Whitelist] WARNING: invalid CIDR %q: %v", cidr, err)
			continue
		}
		nets = append(nets, ipNet)
	}
	log.Printf("[IP-Whitelist] Clock in/out allowed from: %s", raw)

	return func(c *gin.Context) {
		clientIP := net.ParseIP(c.ClientIP())
		if clientIP == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Tidak dapat mendeteksi IP Anda.",
			})
			return
		}

		for _, n := range nets {
			if n.Contains(clientIP) {
				c.Next()
				return
			}
		}

		log.Printf("[IP-Whitelist] BLOCKED clock request from IP %s", c.ClientIP())
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "Clock In/Out hanya bisa dilakukan dari jaringan WiFi gudang!",
		})
	}
}
