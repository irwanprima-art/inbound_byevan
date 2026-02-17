<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dcc extends Model
{
    protected $table = 'dcc';
    protected $fillable = [
        'date', 'phy_inv', 'zone', 'location', 'owner',
        'sku', 'brand', 'description', 'sys_qty', 'phy_qty', 'operator',
    ];
}
