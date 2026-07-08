package main
import (
"fmt"
"github.com/glebarez/sqlite"
"gorm.io/gorm"
)
type Location struct {
LocationType string `gorm:"column:location_type"`
}
func main() {
db, _ := gorm.Open(sqlite.Open("warehouse.db"), &gorm.Config{})
var locs []Location
db.Raw("SELECT DISTINCT location_type FROM locations").Scan(&locs)
for _, l := range locs {
fmt.Printf("Type: '%s'\n", l.LocationType)
}
}
