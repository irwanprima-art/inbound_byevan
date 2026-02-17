<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Soh extends Model
{
    protected $table = 'soh';
    protected $fillable = [
        'location', 'sku', 'sku_category', 'sku_brand', 'zone',
        'location_type', 'owner', 'status', 'qty',
        'wh_arrival_date', 'receipt_no', 'mfg_date', 'exp_date',
        'batch_no', 'update_date',
    ];
}
