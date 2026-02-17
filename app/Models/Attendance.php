<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'nik', 'name', 'status', 'jobdesc', 'divisi',
        'date', 'clock_in', 'clock_out',
    ];
}
