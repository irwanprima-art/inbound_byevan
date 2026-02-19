package models

import (
	"time"

	"gorm.io/gorm"
)

// Arrival represents inbound arrival data
type Arrival struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Date        string         `gorm:"column:date" json:"date"`
	ArrivalTime string         `gorm:"column:arrival_time" json:"arrival_time"`
	ReceiptNo   string         `gorm:"column:receipt_no" json:"receipt_no"`
	PoNo        string         `gorm:"column:po_no" json:"po_no"`
	Brand       string         `gorm:"column:brand" json:"brand"`
	PoQty       int            `gorm:"column:po_qty" json:"po_qty"`
	Operator    string         `gorm:"column:operator" json:"operator"`
	Note        string         `gorm:"column:note" json:"note"`
	ItemType    string         `gorm:"column:item_type;default:Barang Jual" json:"item_type"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Transaction represents inbound transaction data
type Transaction struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	Date            string         `gorm:"column:date" json:"date"`
	TimeTransaction string         `gorm:"column:time_transaction" json:"time_transaction"`
	ReceiptNo       string         `gorm:"column:receipt_no" json:"receipt_no"`
	Sku             string         `gorm:"column:sku" json:"sku"`
	OperateType     string         `gorm:"column:operate_type" json:"operate_type"`
	Qty             int            `gorm:"column:qty" json:"qty"`
	Operator        string         `gorm:"column:operator" json:"operator"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// Vas represents VAS (Value Added Service) data
type Vas struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Date      string         `gorm:"column:date" json:"date"`
	StartTime string         `gorm:"column:start_time" json:"start_time"`
	EndTime   string         `gorm:"column:end_time" json:"end_time"`
	Brand     string         `gorm:"column:brand" json:"brand"`
	Sku       string         `gorm:"column:sku" json:"sku"`
	VasType   string         `gorm:"column:vas_type" json:"vas_type"`
	Qty       int            `gorm:"column:qty" json:"qty"`
	Operator  string         `gorm:"column:operator" json:"operator"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Dcc represents Daily Cycle Count data
type Dcc struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Date        string         `gorm:"column:date" json:"date"`
	PhyInv      string         `gorm:"column:phy_inv" json:"phy_inv"`
	Zone        string         `gorm:"column:zone" json:"zone"`
	Location    string         `gorm:"column:location" json:"location"`
	Owner       string         `gorm:"column:owner" json:"owner"`
	Sku         string         `gorm:"column:sku" json:"sku"`
	Brand       string         `gorm:"column:brand" json:"brand"`
	Description string         `gorm:"column:description" json:"description"`
	SysQty      int            `gorm:"column:sys_qty" json:"sys_qty"`
	PhyQty      int            `gorm:"column:phy_qty" json:"phy_qty"`
	Variance    int            `gorm:"column:variance" json:"variance"`
	Operator    string         `gorm:"column:operator" json:"operator"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Damage represents project damage data
type Damage struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Date         string         `gorm:"column:date" json:"date"`
	Brand        string         `gorm:"column:brand" json:"brand"`
	Sku          string         `gorm:"column:sku" json:"sku"`
	Description  string         `gorm:"column:description" json:"description"`
	Qty          int            `gorm:"column:qty" json:"qty"`
	DamageNote   string         `gorm:"column:damage_note" json:"damage_note"`
	DamageReason string         `gorm:"column:damage_reason" json:"damage_reason"`
	Operator     string         `gorm:"column:operator" json:"operator"`
	QcBy         string         `gorm:"column:qc_by" json:"qc_by"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// Soh represents Stock on Hand data
type Soh struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Location         string         `gorm:"column:location" json:"location"`
	LocationCategory string         `gorm:"column:location_category" json:"location_category"`
	Sku              string         `gorm:"column:sku" json:"sku"`
	SkuCategory      string         `gorm:"column:sku_category" json:"sku_category"`
	Brand            string         `gorm:"column:brand" json:"brand"`
	Zone             string         `gorm:"column:zone" json:"zone"`
	LocationType     string         `gorm:"column:location_type" json:"location_type"`
	Owner            string         `gorm:"column:owner" json:"owner"`
	Status           string         `gorm:"column:status" json:"status"`
	Qty              int            `gorm:"column:qty" json:"qty"`
	WhArrivalDate    string         `gorm:"column:wh_arrival_date" json:"wh_arrival_date"`
	ReceiptNo        string         `gorm:"column:receipt_no" json:"receipt_no"`
	MfgDate          string         `gorm:"column:mfg_date" json:"mfg_date"`
	ExpDate          string         `gorm:"column:exp_date" json:"exp_date"`
	BatchNo          string         `gorm:"column:batch_no" json:"batch_no"`
	UpdateDate       string         `gorm:"column:update_date" json:"update_date"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// QcReturn represents QC return data
type QcReturn struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	QcDate     string         `gorm:"column:qc_date" json:"qc_date"`
	Receipt    string         `gorm:"column:receipt" json:"receipt"`
	ReturnDate string         `gorm:"column:return_date" json:"return_date"`
	Owner      string         `gorm:"column:owner" json:"owner"`
	Sku        string         `gorm:"column:sku" json:"sku"`
	Qty        int            `gorm:"column:qty" json:"qty"`
	FromLoc    string         `gorm:"column:from_loc" json:"from_loc"`
	ToLoc      string         `gorm:"column:to_loc" json:"to_loc"`
	Status     string         `gorm:"column:status" json:"status"`
	Operator   string         `gorm:"column:operator" json:"operator"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// Location represents master location data
type Location struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Location         string         `gorm:"column:location" json:"location"`
	LocationCategory string         `gorm:"column:location_category" json:"location_category"`
	Zone             string         `gorm:"column:zone" json:"zone"`
	LocationType     string         `gorm:"column:location_type" json:"location_type"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// Attendance represents manpower attendance data
type Attendance struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Date      string         `gorm:"column:date" json:"date"`
	Nik       string         `gorm:"column:nik" json:"nik"`
	Name      string         `gorm:"column:name" json:"name"`
	Jobdesc   string         `gorm:"column:jobdesc" json:"jobdesc"`
	ClockIn   string         `gorm:"column:clock_in" json:"clock_in"`
	ClockOut  string         `gorm:"column:clock_out" json:"clock_out"`
	Status    string         `gorm:"column:status" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Employee represents employee data
type Employee struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Nik       string         `gorm:"column:nik" json:"nik"`
	Name      string         `gorm:"column:name" json:"name"`
	Status    string         `gorm:"column:status" json:"status"`
	IsActive  string         `gorm:"column:is_active;default:Active" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ProjectProductivity represents project productivity data
type ProjectProductivity struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Date      string         `gorm:"column:date" json:"date"`
	Project   string         `gorm:"column:project" json:"project"`
	Activity  string         `gorm:"column:activity" json:"activity"`
	Operator  string         `gorm:"column:operator" json:"operator"`
	Qty       int            `gorm:"column:qty" json:"qty"`
	Duration  string         `gorm:"column:duration" json:"duration"`
	Status    string         `gorm:"column:status" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Unloading represents inbound unloading data
type Unloading struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Date          string         `gorm:"column:date" json:"date"`
	Brand         string         `gorm:"column:brand" json:"brand"`
	VehicleType   string         `gorm:"column:vehicle_type" json:"vehicle_type"`
	TotalVehicles int            `gorm:"column:total_vehicles" json:"total_vehicles"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// User represents auth user for JWT login
type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Password string `gorm:"not null" json:"-"`
	Role     string `gorm:"not null" json:"role"`
}
