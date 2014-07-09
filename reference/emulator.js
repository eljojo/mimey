var resultDebug = []
function debugMessage() {
	// resultDebug.push({message: arguments})
}

// hehe dirty stuff
function clone(source) {
	var destination = {}
  for (var property in source) {
      if (typeof source[property] === "object" && source[property] !== null && destination[property]) {
          clone(destination[property], source[property]);
      } else {
          destination[property] = source[property];
      }
  }
	return destination;
}

jsGB = {
	_interval: 0,
	_lastOp: -1,
	totalSteps: 0,
	doDebug: false,

	debug: function() {
		resultDebug.push({
			step: {
				total_steps: jsGB.totalSteps,
				last_op: jsGB._lastOp,
				r: clone(Z80._r),
				gpu_r: {
					intfired: GPU._intfired,
					line: GPU._curline,
					raster: GPU._raster,
					mode: GPU._linemode,
					modeclocks: GPU._modeclocks
				}
			}
		})
	},

	runTest: function() {
		Z80._stop = 0;
		jsGB.doDebug = true
		// jsGB.step()
		for(var i = 1; i <= 7; i++) jsGB.frame()
		// for(var i = 1; i<=110; i++) jsGB.step()

		// jsGB.debug()

	},

	step: function() {
		jsGB.totalSteps += 1
		if(Z80._halt) Z80._r.m=1;
		else
		{
			jsGB._lastOp = MMU.rb(Z80._r.pc++);
			Z80._map[jsGB._lastOp]();
			Z80._r.pc &= 65535;
		}
		Z80._clock.m += Z80._r.m;
		GPU.checkline();
		if (jsGB.doDebug) jsGB.debug()
	},

	frame: function()
	{
		var fclk = Z80._clock.m+17556;
		var steps = 0
		do
		{
			steps += 1
			jsGB.step()
			if(Z80._stop)
			{
				jsGB.pause();
				break;
			}
		} while(Z80._clock.m < fclk);
		// debugMessage('steps', steps)
	},

	reset: function()
	{
		GPU.reset();
		MMU.reset();
		Z80.reset();
		var path = require('path')
		MMU.load(path.resolve(__filename, '../../test_roms/opus5.gb'));
		Z80._r.pc=0x100;MMU._inbios=0;Z80._r.sp=0xFFFE;Z80._r.hl=0x014D;Z80._r.c=0x13;Z80._r.e=0xD8;Z80._r.a=1;
		jsGB._interval = 0;
	},

	run: function()
	{
		Z80._stop = 0;
		if(!jsGB._interval)
		{
			jsGB._interval = setInterval(jsGB.frame, 1);
			// document.getElementById('jsgb_run').innerHTML = 'Pause';
		}
		else
		{
			clearInterval(jsGB._interval);
			jsGB._interval = 0;
			// document.getElementById('jsgb_run').innerHTML = 'Run';
		}
	}
};

GPU = {
  _vram: [],
  _oam: [],
  _reg: [],
  _tilemap: [],
  _objdata: [],
  _objdatasorted: [],
  _palette: {'bg':[], 'obj0':[], 'obj1':[]},
  _scanrow: [],

  _curline: 0,
  _curscan: 0,
  _linemode: 0,
  _modeclocks: 0,

  _yscrl: 0,
  _xscrl: 0,
  _winy: 0,
  _winx: 0,
  _raster: 0,
  _ints: 0,
  _intfired: 0,

  _lcdon: 0,
  _bgon: 0,
  _objon: 0,
  _winon: 0,

  _objsize: 0,

  _bgtilebase: 0x0000,
  _bgmapbase: 0x1800,
  _winmapbase: 0x1800,

  reset: function() {
    for(var i=0; i<8192; i++) {
      GPU._vram[i] = 0;
    }
    for(i=0; i<160; i++) {
      GPU._oam[i] = 0;
    }
    for(i=0; i<4; i++) {
      GPU._palette.bg[i] = 255;
      GPU._palette.obj0[i] = 255;
      GPU._palette.obj1[i] = 255;
    }
    for(i=0;i<512;i++)
    {
      GPU._tilemap[i] = [];
      for(j=0;j<8;j++)
      {
        GPU._tilemap[i][j] = [];
        for(k=0;k<8;k++)
        {
          GPU._tilemap[i][j][k] = 0;
        }
      }
    }

    debugMessage('GPU', 'Initialising screen.');
    // var c = document.getElementById('jsgb_screen');
    // if(c && c.getContext)
    // {
    //   GPU._canvas = c.getContext('2d');
    //   if(!GPU._canvas)
    //   {
    //     throw new Error('GPU: Canvas context could not be created.');
    //   }
    //   else
    //   {
    //     if(GPU._canvas.createImageData)
    //       GPU._scrn = GPU._canvas.createImageData(160,144);
    //     else if(GPU._canvas.getImageData)
    //       GPU._scrn = GPU._canvas.getImageData(0,0,160,144);
    //     else
    //       GPU._scrn = {'width':160, 'height':144, 'data':new Array(160*144*4)};
    //
    //     for(i=0; i<GPU._scrn.data.length; i++)
    //       GPU._scrn.data[i]=255;
    //
    //     GPU._canvas.putImageData(GPU._scrn, 0,0);
    //   }
    // }

    GPU._curline=0;
    GPU._curscan=0;
    GPU._linemode=2;
    GPU._modeclocks=0;
    GPU._yscrl=0;
    GPU._xscrl=0;
    GPU._winy=0;
    GPU._winx=0;
    GPU._raster=0;
    GPU._ints=0;
    GPU._intfired=0;

    GPU._lcdon = 0;
    GPU._bgon = 0;
    GPU._objon = 0;
    GPU._winon = 0;

    GPU._objsize = 0;
    for(i=0; i<160; i++) GPU._scanrow[i] = 0;

    for(i=0; i<40; i++)
    {
      GPU._objdata[i] = {'y':-16, 'x':-8, 'tile':0, 'palette':0, 'yflip':0, 'xflip':0, 'prio':0, 'num':i};
    }

    // Set to values expected by BIOS, to start
    GPU._bgtilebase = 0x0000;
    GPU._bgmapbase = 0x1800;
    GPU._winmapbase = 0x1800;

    debugMessage('GPU', 'Reset.');
  },

  checkline: function() {
    GPU._modeclocks += Z80._r.m;
		// debugMessage('checkline. modeclocks:', GPU._modeclocks, 'mode:', GPU._linemode)
    switch(GPU._linemode)
    {
      // In hblank
      case 0:
				if(GPU._modeclocks >= 51)
				{
					// End of hblank for last scanline; render screen
					if(GPU._curline == 143)
					{
						GPU._linemode = 1;
						// GPU._canvas.putImageData(GPU._scrn, 0,0);
						// debugMessage(GPU._scrn)
						MMU._if |= 1;
						if(GPU._ints&2) { GPU._intfired|=2; MMU._if|=2; }
					}
					else
					{
						GPU._linemode = 2;
						// debugMessage('setting linemode', GPU._linemode)
						if(GPU._ints&4) { GPU._intfired|=4; MMU._if|=2; }
					}
					GPU._curline++;
					// debugMessage('increasing curline', GPU._curline)
					if(GPU._curline == GPU._raster)
					{
						if(GPU._ints&8) { GPU._intfired|=8; MMU._if|=2; }
					}
					GPU._curscan += 640;
					GPU._modeclocks=0;
				}
        break;

      // In vblank
      case 1:
        if(GPU._modeclocks >= 114)
        {
          GPU._modeclocks = 0;
          GPU._curline++;
          if(GPU._curline > 153)
          {
            GPU._curline = 0;
	    GPU._curscan = 0;
            GPU._linemode = 2;
          }
	  if(GPU._ints&4) { GPU._intfired|=4; MMU._if|=2; }
        }
        break;

      // In OAM-read mode
      case 2:
        if(GPU._modeclocks >= 20)
        {
          GPU._modeclocks = 0;
          GPU._linemode = 3;
        }
        break;

      // In VRAM-read mode
      case 3:
        // Render scanline at end of allotted time
				if(GPU._modeclocks >= 43)
				{
					GPU._modeclocks = 0;
					GPU._linemode = 0;
					if(GPU._ints&1) { GPU._intfired|=1; MMU._if|=2; }

					if(GPU._lcdon)
					{
						if(GPU._bgon)
						{
							var linebase = GPU._curscan;
							var mapbase = GPU._bgmapbase + ((((GPU._curline+GPU._yscrl)&255)>>3)<<5);
							var y = (GPU._curline+GPU._yscrl)&7;
							var x = GPU._xscrl&7;
							var t = (GPU._xscrl>>3)&31;
							var pixel;
							var w=160;

							if(GPU._bgtilebase)
							{
								var tile = GPU._vram[mapbase+t];
								if(tile<128) tile=256+tile;
								var tilerow = GPU._tilemap[tile][y];
								do
								{
									GPU._scanrow[160-x] = tilerow[x];
									GPU._scrn.data[linebase+3] = GPU._palette.bg[tilerow[x]];
									x++;
									if(x==8) { t=(t+1)&31; x=0; tile=GPU._vram[mapbase+t]; if(tile<128) tile=256+tile; tilerow = GPU._tilemap[tile][y]; }
									linebase+=4;
								} while(--w);
							}
							else
							{
								var tilerow=GPU._tilemap[GPU._vram[mapbase+t]][y];
								do
								{
									GPU._scanrow[160-x] = tilerow[x];
									// GPU._scrn.data[linebase+3] = GPU._palette.bg[tilerow[x]];
									x++;
									if(x==8) { t=(t+1)&31; x=0; tilerow=GPU._tilemap[GPU._vram[mapbase+t]][y]; }
									linebase+=4;
								} while(--w);
							}
						}
					}
				}
        break;
    }
  },

  updatetile: function(addr,val) {
		// debugMessage("updating tile:", addr, val)
    var saddr = addr;
    if(addr&1) { saddr--; addr--; }
    var tile = (addr>>4)&511;
    var y = (addr>>1)&7;
    var sx;
    for(var x=0;x<8;x++)
    {
      sx=1<<(7-x);
      GPU._tilemap[tile][y][x] = ((GPU._vram[saddr]&sx)?1:0) | ((GPU._vram[saddr+1]&sx)?2:0);
    }
  },

  updateoam: function(addr,val) {
    addr-=0xFE00;
    var obj=addr>>2;
    if(obj<40)
    {
      switch(addr&3)
      {
        case 0: GPU._objdata[obj].y=val-16; break;
        case 1: GPU._objdata[obj].x=val-8; break;
        case 2:
          if(GPU._objsize) GPU._objdata[obj].tile = (val&0xFE);
          else GPU._objdata[obj].tile = val;
          break;
        case 3:
          GPU._objdata[obj].palette = (val&0x10)?1:0;
          GPU._objdata[obj].xflip = (val&0x20)?1:0;
          GPU._objdata[obj].yflip = (val&0x40)?1:0;
          GPU._objdata[obj].prio = (val&0x80)?1:0;
          break;
     }
    }
    GPU._objdatasorted = GPU._objdata;
    GPU._objdatasorted.sort(function(a,b){
      if(a.x>b.x) return -1;
      if(a.num>b.num) return -1;
    });
  },

  rb: function(addr) {
    var gaddr = addr-0xFF40;
    switch(gaddr)
    {
      case 0:
        return (GPU._lcdon?0x80:0)|
	       ((GPU._winmapbase==0x1C00)?0x40:0)|
	       (GPU._winon?0x20:0)|
               ((GPU._bgtilebase==0x0000)?0x10:0)|
               ((GPU._bgmapbase==0x1C00)?0x08:0)|
               (GPU._objsize?0x04:0)|
               (GPU._objon?0x02:0)|
               (GPU._bgon?0x01:0);

      case 1:
				// debugMessage('reading from 0xFF41')
				// debugMessage(GPU._intfired, GPU._curline, GPU._raster, GPU._linemode)
        var intf = GPU._intfired;
	GPU._intfired=0;
        return (intf<<3)|(GPU._curline==GPU._raster?4:0)|GPU._linemode;

      case 2:
        return GPU._yscrl;

      case 3:
        return GPU._xscrl;

      case 4:
        return GPU._curline;

      case 5:
        return GPU._raster;

      case 10:
        return GPU._winy;

      case 11:
        return GPU._winx+7;

      default:
        return GPU._reg[gaddr];
    }
  },

  wb: function(addr,val) {
    var gaddr = addr-0xFF40;
    GPU._reg[gaddr] = val;
    switch(gaddr)
    {
      case 0:
        GPU._lcdon = (val&0x80)?1:0;
	GPU._winmapbase = (val&0x40)?0x1C00:0x1800;
	GPU._winon = (val&0x20)?1:0;
        GPU._bgtilebase = (val&0x10)?0x0000:0x0800;
        GPU._bgmapbase = (val&0x08)?0x1C00:0x1800;
        GPU._objsize = (val&0x04)?1:0;
        GPU._objon = (val&0x02)?1:0;
        GPU._bgon = (val&0x01)?1:0;
        break;

      case 1:
				// debugMessage('writing to 0xFF41', val)
        GPU._ints = (val>>3)&15;
	break;

      case 2:
        GPU._yscrl = val;
        break;

      case 3:
        GPU._xscrl = val;
        break;

      case 5:
        GPU._raster = val;

      // OAM DMA
      case 6:
        var v;
        for(var i=0; i<160; i++)
        {
          v = MMU.rb((val<<8)+i);
          GPU._oam[i] = v;
          GPU.updateoam(0xFE00+i, v);
        }
        break;

      // BG palette mapping
      case 7:
        for(var i=0;i<4;i++)
        {
          switch((val>>(i*2))&3)
          {
            case 0: GPU._palette.bg[i] = 255; break;
            case 1: GPU._palette.bg[i] = 192; break;
            case 2: GPU._palette.bg[i] = 96; break;
            case 3: GPU._palette.bg[i] = 0; break;
          }
        }
        break;

      // OBJ0 palette mapping
      case 8:
        for(var i=0;i<4;i++)
        {
          switch((val>>(i*2))&3)
          {
            case 0: GPU._palette.obj0[i] = 255; break;
            case 1: GPU._palette.obj0[i] = 192; break;
            case 2: GPU._palette.obj0[i] = 96; break;
            case 3: GPU._palette.obj0[i] = 0; break;
          }
        }
        break;

      // OBJ1 palette mapping
      case 9:
        for(var i=0;i<4;i++)
        {
          switch((val>>(i*2))&3)
          {
            case 0: GPU._palette.obj1[i] = 255; break;
            case 1: GPU._palette.obj1[i] = 192; break;
            case 2: GPU._palette.obj1[i] = 96; break;
            case 3: GPU._palette.obj1[i] = 0; break;
          }
        }
        break;

      case 10:
        GPU._winy = val;
	break;

      case 11:
        GPU._winx = val-7;
	break;
    }
  }
};

LOG = {
  _start: 0,

  reset: function() {
    d=new Date(); LOG._start=d.getTime();
  },

  out: function(module, str) {
    t=new Date(); ts=t.getTime()-LOG._start;
    //debugMessage('{'+ts+'ms} ['+module+'] '+str);
    // document.getElementById('jsgb_msg').innerHTML += ('{'+ts+'ms} ['+module+'] '+str+'<br>');
  }
};
MMU = {
  _bios: [
    0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
    0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
    0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
    0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
    0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
    0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
    0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
    0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
    0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xF2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
    0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
    0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
    0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
    0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
    0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3c, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x4C,
    0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
    0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
  ],
  _rom: '',
  _carttype: 0,
  _mbc: [
    {},
    {rombank:0, rambank:0, ramon:0, mode:0}
  ],
  _romoffs: 0x4000,
  _ramoffs: 0,

  _eram: [],
  _wram: [],
  _zram: [],

  _inbios: 1,
  _ie: 0,
  _if: 0,

  reset: function() {
    for(i=0; i<8192; i++) MMU._wram[i] = 0;
    for(i=0; i<32768; i++) MMU._eram[i] = 0;
    for(i=0; i<127; i++) MMU._zram[i] = 0;

    MMU._inbios=1;
    MMU._ie=0;
    MMU._if=0;

    MMU._carttype=0;
    MMU._mbc[0] = {};
    MMU._mbc[1] = {rombank:0, rambank:0, ramon:0, mode:0};
    MMU._romoffs=0x4000;
    MMU._ramoffs=0;

    debugMessage('MMU', 'Reset.');
  },

  load: function(file) {
    // b=new BinFileReader(file);
    // MMU._rom=b.readString(b.getFileSize(), 0);
		debugMessage('we should load the rom here', file)
		var fs = require('fs');
		MMU._rom = fs.readFileSync(file).toString('binary')
    MMU._carttype = MMU._rom.charCodeAt(0x0147);

    debugMessage('MMU', 'ROM loaded, '+MMU._rom.length+' bytes.');
  },

  rb: function(addr) {
    switch(addr&0xF000)
    {
      // ROM bank 0
      case 0x0000:
        if(MMU._inbios)
	{
	  if(addr<0x0100) return MMU._bios[addr];
	  else if(Z80._r.pc == 0x0100)
	  {
	    MMU._inbios = 0;
	    debugMessage('MMU', 'Leaving BIOS.');
	  }
	}
	else
	{
	  return MMU._rom.charCodeAt(addr);
	}

      case 0x1000:
      case 0x2000:
      case 0x3000:
        return MMU._rom.charCodeAt(addr);

      // ROM bank 1
      case 0x4000: case 0x5000: case 0x6000: case 0x7000:
        return MMU._rom.charCodeAt(MMU._romoffs+(addr&0x3FFF));

      // VRAM
      case 0x8000: case 0x9000:
        return GPU._vram[addr&0x1FFF];

      // External RAM
      case 0xA000: case 0xB000:
        return MMU._eram[MMU._ramoffs+(addr&0x1FFF)];

      // Work RAM and echo
      case 0xC000: case 0xD000: case 0xE000:
        return MMU._wram[addr&0x1FFF];

      // Everything else
      case 0xF000:
        switch(addr&0x0F00)
	{
	  // Echo RAM
	  case 0x000: case 0x100: case 0x200: case 0x300:
	  case 0x400: case 0x500: case 0x600: case 0x700:
	  case 0x800: case 0x900: case 0xA00: case 0xB00:
	  case 0xC00: case 0xD00:
	    return MMU._wram[addr&0x1FFF];

          // OAM
	  case 0xE00:
	    return ((addr&0xFF)<0xA0) ? GPU._oam[addr&0xFF] : 0;

          // Zeropage RAM, I/O, interrupts
	  case 0xF00:
	    if(addr == 0xFFFF) { return MMU._ie; }
	    else if(addr > 0xFF7F) { return MMU._zram[addr&0x7F]; }
	    else switch(addr&0xF0)
	    {
	      case 0x00:
	        switch(addr&0xF)
		{
		  case 15: return MMU._if;    // Interrupt flags
		  default: return 0;
		}

              case 0x10: case 0x20: case 0x30:
	        return 0;

              case 0x40: case 0x50: case 0x60: case 0x70:
	        return GPU.rb(addr);
	    }
	}
    }
  },

  rw: function(addr) { var res = MMU.rb(addr)+(MMU.rb(addr+1)<<8); /* debugMessage("reading word in", addr, ":", res); */ return res; },

  wb: function(addr,val) {
    switch(addr&0xF000)
    {
      // ROM bank 0
      // MBC1: Turn external RAM on
      case 0x0000: case 0x1000:
        switch(MMU._carttype)
	{
	  case 1:
	    MMU._mbc[1].ramon = ((val&0xF)==0xA)?1:0;
	    break;
	}
	break;

      // MBC1: ROM bank switch
      case 0x2000: case 0x3000:
        switch(MMU._carttype)
	{
	  case 1:
	    MMU._mbc[1].rombank &= 0x60;
	    val &= 0x1F;
	    if(!val) val=1;
	    MMU._mbc[1].rombank |= val;
	    MMU._romoffs = MMU._mbc[1].rombank * 0x4000;
	    break;
	}
        break;

      // ROM bank 1
      // MBC1: RAM bank switch
      case 0x4000: case 0x5000:
        switch(MMU._carttype)
	{
	  case 1:
	    if(MMU._mbc[1].mode)
	    {
	      MMU._mbc[1].rambank = (val&3);
	      MMU._ramoffs = MMU._mbc[1].rambank * 0x2000;
	    }
	    else
	    {
	      MMU._mbc[1].rombank &= 0x1F;
	      MMU._mbc[1].rombank |= ((val&3)<<5);
	      MMU._romoffs = MMU._mbc[1].rombank * 0x4000;
	    }
	}
        break;

      case 0x6000: case 0x7000:
        switch(MMU._carttype)
	{
	  case 1:
	    MMU._mbc[1].mode = val&1;
	    break;
	}
        break;

      // VRAM
      case 0x8000: case 0x9000:
        GPU._vram[addr&0x1FFF] = val;
	GPU.updatetile(addr&0x1FFF, val);
	break;

      // External RAM
      case 0xA000: case 0xB000:
        MMU._eram[MMU._ramoffs+(addr&0x1FFF)] = val;
	break;

      // Work RAM and echo
      case 0xC000: case 0xD000: case 0xE000:
        MMU._wram[addr&0x1FFF] = val;
	break;

      // Everything else
      case 0xF000:
        switch(addr&0x0F00)
	{
	  // Echo RAM
	  case 0x000: case 0x100: case 0x200: case 0x300:
	  case 0x400: case 0x500: case 0x600: case 0x700:
	  case 0x800: case 0x900: case 0xA00: case 0xB00:
	  case 0xC00: case 0xD00:
	    MMU._wram[addr&0x1FFF] = val;
	    break;

          // OAM
	  case 0xE00:
	    if((addr&0xFF)<0xA0) GPU._oam[addr&0xFF] = val;
	    GPU.updateoam(addr,val);
	    break;

          // Zeropage RAM, I/O, interrupts
	  case 0xF00:
	    if(addr == 0xFFFF) { MMU._ie = val; }
	    else if(addr > 0xFF7F) { MMU._zram[addr&0x7F]=val; }
	    else switch(addr&0xF0)
	    {
	      case 0x00:
	        switch(addr&0xF)
		{
		  case 15: MMU._if = val; break;
		}
	        break;

              case 0x10: case 0x20: case 0x30:
	        break;

              case 0x40: case 0x50: case 0x60: case 0x70:
	        GPU.wb(addr,val);
		break;
	    }
	}
	break;
    }
  },

  ww: function(addr,val) { MMU.wb(addr,val&255); MMU.wb(addr+1,val>>8); }
};

Z80 = {
  _r: {
    a:0, b:0, c:0, d:0, e:0, h:0, l:0, f:0,
    sp:0, pc:0, i:0, r:0,
    m:0,
    ime:0
  },

  _rsv: {
    a:0, b:0, c:0, d:0, e:0, h:0, l:0, f:0
  },

  _clock: {m:0},

  _halt: 0,
  _stop: 0,

  reset: function() {
    Z80._r.a=0; Z80._r.b=0; Z80._r.c=0; Z80._r.d=0; Z80._r.e=0; Z80._r.h=0; Z80._r.l=0; Z80._r.f=0;
    Z80._r.sp=0; Z80._r.pc=0; Z80._r.i=0; Z80._r.r=0;
    Z80._r.m=0;
    Z80._halt=0; Z80._stop=0;
    Z80._clock.m=0;
    Z80._r.ime=1;
    debugMessage('Z80', 'Reset.');
  },

  exec: function() {
    Z80._r.r = (Z80._r.r+1) & 127;
    Z80._map[MMU.rb(Z80._r.pc++)]();
    Z80._r.pc &= 65535;
    Z80._clock.m += Z80._r.m;
  },

  _ops: {
    /*--- Load/store ---*/
    LDrr_bb: function() { Z80._r.b=Z80._r.b; Z80._r.m=1; },
    LDrr_bc: function() { Z80._r.b=Z80._r.c; Z80._r.m=1; },
    LDrr_bd: function() { Z80._r.b=Z80._r.d; Z80._r.m=1; },
    LDrr_be: function() { Z80._r.b=Z80._r.e; Z80._r.m=1; },
    LDrr_bh: function() { Z80._r.b=Z80._r.h; Z80._r.m=1; },
    LDrr_bl: function() { Z80._r.b=Z80._r.l; Z80._r.m=1; },
    LDrr_ba: function() { Z80._r.b=Z80._r.a; Z80._r.m=1; },
    LDrr_cb: function() { Z80._r.c=Z80._r.b; Z80._r.m=1; },
    LDrr_cc: function() { Z80._r.c=Z80._r.c; Z80._r.m=1; },
    LDrr_cd: function() { Z80._r.c=Z80._r.d; Z80._r.m=1; },
    LDrr_ce: function() { Z80._r.c=Z80._r.e; Z80._r.m=1; },
    LDrr_ch: function() { Z80._r.c=Z80._r.h; Z80._r.m=1; },
    LDrr_cl: function() { Z80._r.c=Z80._r.l; Z80._r.m=1; },
    LDrr_ca: function() { Z80._r.c=Z80._r.a; Z80._r.m=1; },
    LDrr_db: function() { Z80._r.d=Z80._r.b; Z80._r.m=1; },
    LDrr_dc: function() { Z80._r.d=Z80._r.c; Z80._r.m=1; },
    LDrr_dd: function() { Z80._r.d=Z80._r.d; Z80._r.m=1; },
    LDrr_de: function() { Z80._r.d=Z80._r.e; Z80._r.m=1; },
    LDrr_dh: function() { Z80._r.d=Z80._r.h; Z80._r.m=1; },
    LDrr_dl: function() { Z80._r.d=Z80._r.l; Z80._r.m=1; },
    LDrr_da: function() { Z80._r.d=Z80._r.a; Z80._r.m=1; },
    LDrr_eb: function() { Z80._r.e=Z80._r.b; Z80._r.m=1; },
    LDrr_ec: function() { Z80._r.e=Z80._r.c; Z80._r.m=1; },
    LDrr_ed: function() { Z80._r.e=Z80._r.d; Z80._r.m=1; },
    LDrr_ee: function() { Z80._r.e=Z80._r.e; Z80._r.m=1; },
    LDrr_eh: function() { Z80._r.e=Z80._r.h; Z80._r.m=1; },
    LDrr_el: function() { Z80._r.e=Z80._r.l; Z80._r.m=1; },
    LDrr_ea: function() { Z80._r.e=Z80._r.a; Z80._r.m=1; },
    LDrr_hb: function() { Z80._r.h=Z80._r.b; Z80._r.m=1; },
    LDrr_hc: function() { Z80._r.h=Z80._r.c; Z80._r.m=1; },
    LDrr_hd: function() { Z80._r.h=Z80._r.d; Z80._r.m=1; },
    LDrr_he: function() { Z80._r.h=Z80._r.e; Z80._r.m=1; },
    LDrr_hh: function() { Z80._r.h=Z80._r.h; Z80._r.m=1; },
    LDrr_hl: function() { Z80._r.h=Z80._r.l; Z80._r.m=1; },
    LDrr_ha: function() { Z80._r.h=Z80._r.a; Z80._r.m=1; },
    LDrr_lb: function() { Z80._r.l=Z80._r.b; Z80._r.m=1; },
    LDrr_lc: function() { Z80._r.l=Z80._r.c; Z80._r.m=1; },
    LDrr_ld: function() { Z80._r.l=Z80._r.d; Z80._r.m=1; },
    LDrr_le: function() { Z80._r.l=Z80._r.e; Z80._r.m=1; },
    LDrr_lh: function() { Z80._r.l=Z80._r.h; Z80._r.m=1; },
    LDrr_ll: function() { Z80._r.l=Z80._r.l; Z80._r.m=1; },
    LDrr_la: function() { Z80._r.l=Z80._r.a; Z80._r.m=1; },
    LDrr_ab: function() { Z80._r.a=Z80._r.b; Z80._r.m=1; },
    LDrr_ac: function() { Z80._r.a=Z80._r.c; Z80._r.m=1; },
    LDrr_ad: function() { Z80._r.a=Z80._r.d; Z80._r.m=1; },
    LDrr_ae: function() { Z80._r.a=Z80._r.e; Z80._r.m=1; },
    LDrr_ah: function() { Z80._r.a=Z80._r.h; Z80._r.m=1; },
    LDrr_al: function() { Z80._r.a=Z80._r.l; Z80._r.m=1; },
    LDrr_aa: function() { Z80._r.a=Z80._r.a; Z80._r.m=1; },

    LDrHLm_b: function() { Z80._r.b=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.m=2; },
    LDrHLm_c: function() { Z80._r.c=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.m=2; },
    LDrHLm_d: function() { Z80._r.d=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.m=2; },
    LDrHLm_e: function() { Z80._r.e=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.m=2; },
    LDrHLm_h: function() { Z80._r.h=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.m=2; },
    LDrHLm_l: function() { Z80._r.l=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.m=2; },
    LDrHLm_a: function() { Z80._r.a=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.m=2; },

    LDHLmr_b: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l,Z80._r.b); Z80._r.m=2; },
    LDHLmr_c: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l,Z80._r.c); Z80._r.m=2; },
    LDHLmr_d: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l,Z80._r.d); Z80._r.m=2; },
    LDHLmr_e: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l,Z80._r.e); Z80._r.m=2; },
    LDHLmr_h: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l,Z80._r.h); Z80._r.m=2; },
    LDHLmr_l: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l,Z80._r.l); Z80._r.m=2; },
    LDHLmr_a: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l,Z80._r.a); Z80._r.m=2; },

    LDrn_b: function() { Z80._r.b=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.m=2; },
    LDrn_c: function() { Z80._r.c=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.m=2; },
    LDrn_d: function() { Z80._r.d=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.m=2; },
    LDrn_e: function() { Z80._r.e=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.m=2; },
    LDrn_h: function() { Z80._r.h=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.m=2; },
    LDrn_l: function() { Z80._r.l=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.m=2; },
    LDrn_a: function() { Z80._r.a=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.m=2; },

    LDHLmn: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l, MMU.rb(Z80._r.pc)); Z80._r.pc++; Z80._r.m=3; },

    LDBCmA: function() { MMU.wb((Z80._r.b<<8)+Z80._r.c, Z80._r.a); Z80._r.m=2; },
    LDDEmA: function() { MMU.wb((Z80._r.d<<8)+Z80._r.e, Z80._r.a); Z80._r.m=2; },

    LDmmA: function() { MMU.wb(MMU.rw(Z80._r.pc), Z80._r.a); Z80._r.pc+=2; Z80._r.m=4; },

    LDABCm: function() { Z80._r.a=MMU.rb((Z80._r.b<<8)+Z80._r.c); Z80._r.m=2; },
    LDADEm: function() { Z80._r.a=MMU.rb((Z80._r.d<<8)+Z80._r.e); Z80._r.m=2; },

    LDAmm: function() { Z80._r.a=MMU.rb(MMU.rw(Z80._r.pc)); Z80._r.pc+=2; Z80._r.m=4; },

    LDBCnn: function() { Z80._r.c=MMU.rb(Z80._r.pc); Z80._r.b=MMU.rb(Z80._r.pc+1); Z80._r.pc+=2; Z80._r.m=3; },
    LDDEnn: function() { Z80._r.e=MMU.rb(Z80._r.pc); Z80._r.d=MMU.rb(Z80._r.pc+1); Z80._r.pc+=2; Z80._r.m=3; },
    LDHLnn: function() { Z80._r.l=MMU.rb(Z80._r.pc); Z80._r.h=MMU.rb(Z80._r.pc+1); Z80._r.pc+=2; Z80._r.m=3; },
    LDSPnn: function() { Z80._r.sp=MMU.rw(Z80._r.pc); Z80._r.pc+=2; Z80._r.m=3; },

    LDHLmm: function() { var i=MMU.rw(Z80._r.pc); Z80._r.pc+=2; Z80._r.l=MMU.rb(i); Z80._r.h=MMU.rb(i+1); Z80._r.m=5; },
    LDmmHL: function() { var i=MMU.rw(Z80._r.pc); Z80._r.pc+=2; MMU.ww(i,(Z80._r.h<<8)+Z80._r.l); Z80._r.m=5; },

    LDHLIA: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l, Z80._r.a); Z80._r.l=(Z80._r.l+1)&255; if(!Z80._r.l) Z80._r.h=(Z80._r.h+1)&255; Z80._r.m=2; },
    LDAHLI: function() { Z80._r.a=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.l=(Z80._r.l+1)&255; if(!Z80._r.l) Z80._r.h=(Z80._r.h+1)&255; Z80._r.m=2; },

    LDHLDA: function() { MMU.wb((Z80._r.h<<8)+Z80._r.l, Z80._r.a); Z80._r.l=(Z80._r.l-1)&255; if(Z80._r.l==255) Z80._r.h=(Z80._r.h-1)&255; Z80._r.m=2; },
    LDAHLD: function() { Z80._r.a=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.l=(Z80._r.l-1)&255; if(Z80._r.l==255) Z80._r.h=(Z80._r.h-1)&255; Z80._r.m=2; },

    LDAIOn: function() {
			Z80._r.a=MMU.rb(0xFF00+MMU.rb(Z80._r.pc)); Z80._r.pc++; Z80._r.m=3;
		},
    LDIOnA: function() { MMU.wb(0xFF00+MMU.rb(Z80._r.pc),Z80._r.a); Z80._r.pc++; Z80._r.m=3; },
    LDAIOC: function() { Z80._r.a=MMU.rb(0xFF00+Z80._r.c); Z80._r.m=2; },
    LDIOCA: function() { MMU.wb(0xFF00+Z80._r.c,Z80._r.a); Z80._r.m=2; },

    LDHLSPn: function() { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; i+=Z80._r.sp; Z80._r.h=(i>>8)&255; Z80._r.l=i&255; Z80._r.m=3; },

    SWAPr_b: function() { var tr=Z80._r.b; Z80._r.b=((tr&0xF)<<4)|((tr&0xF0)>>4); Z80._r.f=Z80._r.b?0:0x80; Z80._r.m=1; },
    SWAPr_c: function() { var tr=Z80._r.c; Z80._r.c=((tr&0xF)<<4)|((tr&0xF0)>>4); Z80._r.f=Z80._r.c?0:0x80; Z80._r.m=1; },
    SWAPr_d: function() { var tr=Z80._r.d; Z80._r.d=((tr&0xF)<<4)|((tr&0xF0)>>4); Z80._r.f=Z80._r.d?0:0x80; Z80._r.m=1; },
    SWAPr_e: function() { var tr=Z80._r.e; Z80._r.e=((tr&0xF)<<4)|((tr&0xF0)>>4); Z80._r.f=Z80._r.e?0:0x80; Z80._r.m=1; },
    SWAPr_h: function() { var tr=Z80._r.h; Z80._r.h=((tr&0xF)<<4)|((tr&0xF0)>>4); Z80._r.f=Z80._r.h?0:0x80; Z80._r.m=1; },
    SWAPr_l: function() { var tr=Z80._r.l; Z80._r.l=((tr&0xF)<<4)|((tr&0xF0)>>4); Z80._r.f=Z80._r.l?0:0x80; Z80._r.m=1; },
    SWAPr_a: function() { var tr=Z80._r.a; Z80._r.a=((tr&0xF)<<4)|((tr&0xF0)>>4); Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },

    /*--- Data processing ---*/
    ADDr_b: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.b; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.b^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADDr_c: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.c; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.c^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADDr_d: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.d; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.d^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADDr_e: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.e; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.e^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADDr_h: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.h; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.h^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADDr_l: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.l; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.l^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADDr_a: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.a; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.a^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADDHL: function() { var a=Z80._r.a; var m=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.a+=m; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^a^m)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },
    ADDn: function() { var a=Z80._r.a; var m=MMU.rb(Z80._r.pc); Z80._r.a+=m; Z80._r.pc++; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^a^m)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },
    ADDHLBC: function() { var hl=(Z80._r.h<<8)+Z80._r.l; hl+=(Z80._r.b<<8)+Z80._r.c; if(hl>65535) Z80._r.f|=0x10; else Z80._r.f&=0xEF; Z80._r.h=(hl>>8)&255; Z80._r.l=hl&255; Z80._r.m=3; },
    ADDHLDE: function() { var hl=(Z80._r.h<<8)+Z80._r.l; hl+=(Z80._r.d<<8)+Z80._r.e; if(hl>65535) Z80._r.f|=0x10; else Z80._r.f&=0xEF; Z80._r.h=(hl>>8)&255; Z80._r.l=hl&255; Z80._r.m=3; },
    ADDHLHL: function() { var hl=(Z80._r.h<<8)+Z80._r.l; hl+=(Z80._r.h<<8)+Z80._r.l; if(hl>65535) Z80._r.f|=0x10; else Z80._r.f&=0xEF; Z80._r.h=(hl>>8)&255; Z80._r.l=hl&255; Z80._r.m=3; },
    ADDHLSP: function() { var hl=(Z80._r.h<<8)+Z80._r.l; hl+=Z80._r.sp; if(hl>65535) Z80._r.f|=0x10; else Z80._r.f&=0xEF; Z80._r.h=(hl>>8)&255; Z80._r.l=hl&255; Z80._r.m=3; },
    ADDSPn: function() { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; Z80._r.sp+=i; Z80._r.m=4; },

    ADCr_b: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.b; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.b^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADCr_c: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.c; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.c^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADCr_d: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.d; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.d^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADCr_e: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.e; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.e^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADCr_h: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.h; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.h^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADCr_l: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.l; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.l^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADCr_a: function() { var a=Z80._r.a; Z80._r.a+=Z80._r.a; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.a^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    ADCHL: function() { var a=Z80._r.a; var m=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.a+=m; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^m^a)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },
    ADCn: function() { var a=Z80._r.a; var m=MMU.rb(Z80._r.pc); Z80._r.a+=m; Z80._r.pc++; Z80._r.a+=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a>255)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^m^a)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },

    SUBr_b: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.b; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.b^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SUBr_c: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.c; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.c^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SUBr_d: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.d; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.d^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SUBr_e: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.e; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.e^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SUBr_h: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.h; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.h^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SUBr_l: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.l; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.l^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SUBr_a: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.a; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.a^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SUBHL: function() { var a=Z80._r.a; var m=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.a-=m; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^m^a)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },
    SUBn: function() { var a=Z80._r.a; var m=MMU.rb(Z80._r.pc); Z80._r.a-=m; Z80._r.pc++; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^m^a)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },

    SBCr_b: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.b; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.b^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SBCr_c: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.c; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.c^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SBCr_d: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.d; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.d^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SBCr_e: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.e; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.e^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SBCr_h: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.h; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.h^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SBCr_l: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.l; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.l^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SBCr_a: function() { var a=Z80._r.a; Z80._r.a-=Z80._r.a; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.a^a)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    SBCHL: function() { var a=Z80._r.a; var m=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.a-=m; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^m^a)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },
    SBCn: function() { var a=Z80._r.a; var m=MMU.rb(Z80._r.pc); Z80._r.a-=m; Z80._r.pc++; Z80._r.a-=(Z80._r.f&0x10)?1:0; Z80._r.f=(Z80._r.a<0)?0x50:0x40; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; if((Z80._r.a^m^a)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },

    CPr_b: function() { var i=Z80._r.a; i-=Z80._r.b; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.b^i)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    CPr_c: function() { var i=Z80._r.a; i-=Z80._r.c; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.c^i)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    CPr_d: function() { var i=Z80._r.a; i-=Z80._r.d; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.d^i)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    CPr_e: function() { var i=Z80._r.a; i-=Z80._r.e; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.e^i)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    CPr_h: function() {alert('hi'); var i=Z80._r.a; i-=Z80._r.h; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.h^i)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    CPr_l: function() { var i=Z80._r.a; i-=Z80._r.l; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.l^i)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    CPr_a: function() { var i=Z80._r.a; i-=Z80._r.a; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^Z80._r.a^i)&0x10) Z80._r.f|=0x20; Z80._r.m=1; },
    CPHL: function() { var i=Z80._r.a; var m=MMU.rb((Z80._r.h<<8)+Z80._r.l); i-=m; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^i^m)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },
    CPn: function() { var i=Z80._r.a; var m=MMU.rb(Z80._r.pc); i-=m; Z80._r.pc++; Z80._r.f=(i<0)?0x50:0x40; i&=255; if(!i) Z80._r.f|=0x80; if((Z80._r.a^i^m)&0x10) Z80._r.f|=0x20; Z80._r.m=2; },

    DAA: function() { var a=Z80._r.a; if((Z80._r.f&0x20)||((Z80._r.a&15)>9)) Z80._r.a+=6; Z80._r.f&=0xEF; if((Z80._r.f&0x20)||(a>0x99)) { Z80._r.a+=0x60; Z80._r.f|=0x10; } Z80._r.m=1; },

    ANDr_b: function() { Z80._r.a&=Z80._r.b; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ANDr_c: function() { Z80._r.a&=Z80._r.c; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ANDr_d: function() { Z80._r.a&=Z80._r.d; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ANDr_e: function() { Z80._r.a&=Z80._r.e; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ANDr_h: function() { Z80._r.a&=Z80._r.h; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ANDr_l: function() { Z80._r.a&=Z80._r.l; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ANDr_a: function() { Z80._r.a&=Z80._r.a; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ANDHL: function() { Z80._r.a&=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=2; },
    ANDn: function() { Z80._r.a&=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=2; },

    ORr_b: function() { Z80._r.a|=Z80._r.b; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ORr_c: function() { Z80._r.a|=Z80._r.c; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ORr_d: function() { Z80._r.a|=Z80._r.d; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ORr_e: function() { Z80._r.a|=Z80._r.e; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ORr_h: function() { Z80._r.a|=Z80._r.h; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ORr_l: function() { Z80._r.a|=Z80._r.l; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ORr_a: function() { Z80._r.a|=Z80._r.a; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    ORHL: function() { Z80._r.a|=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=2; },
    ORn: function() { Z80._r.a|=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=2; },

    XORr_b: function() { Z80._r.a^=Z80._r.b; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    XORr_c: function() { Z80._r.a^=Z80._r.c; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    XORr_d: function() { Z80._r.a^=Z80._r.d; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    XORr_e: function() { Z80._r.a^=Z80._r.e; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    XORr_h: function() { Z80._r.a^=Z80._r.h; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    XORr_l: function() { Z80._r.a^=Z80._r.l; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    XORr_a: function() { Z80._r.a^=Z80._r.a; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    XORHL: function() { Z80._r.a^=MMU.rb((Z80._r.h<<8)+Z80._r.l); Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=2; },
    XORn: function() { Z80._r.a^=MMU.rb(Z80._r.pc); Z80._r.pc++; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=2; },

    INCr_b: function() { Z80._r.b++; Z80._r.b&=255; Z80._r.f=Z80._r.b?0:0x80; Z80._r.m=1; },
    INCr_c: function() { Z80._r.c++; Z80._r.c&=255; Z80._r.f=Z80._r.c?0:0x80; Z80._r.m=1; },
    INCr_d: function() { Z80._r.d++; Z80._r.d&=255; Z80._r.f=Z80._r.d?0:0x80; Z80._r.m=1; },
    INCr_e: function() { Z80._r.e++; Z80._r.e&=255; Z80._r.f=Z80._r.e?0:0x80; Z80._r.m=1; },
    INCr_h: function() { Z80._r.h++; Z80._r.h&=255; Z80._r.f=Z80._r.h?0:0x80; Z80._r.m=1; },
    INCr_l: function() { Z80._r.l++; Z80._r.l&=255; Z80._r.f=Z80._r.l?0:0x80; Z80._r.m=1; },
    INCr_a: function() { Z80._r.a++; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    INCHLm: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l)+1; i&=255; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.f=i?0:0x80; Z80._r.m=3; },

    DECr_b: function() { Z80._r.b--; Z80._r.b&=255; Z80._r.f=Z80._r.b?0:0x80; Z80._r.m=1; },
    DECr_c: function() { Z80._r.c--; Z80._r.c&=255; Z80._r.f=Z80._r.c?0:0x80; Z80._r.m=1; },
    DECr_d: function() { Z80._r.d--; Z80._r.d&=255; Z80._r.f=Z80._r.d?0:0x80; Z80._r.m=1; },
    DECr_e: function() { Z80._r.e--; Z80._r.e&=255; Z80._r.f=Z80._r.e?0:0x80; Z80._r.m=1; },
    DECr_h: function() { Z80._r.h--; Z80._r.h&=255; Z80._r.f=Z80._r.h?0:0x80; Z80._r.m=1; },
    DECr_l: function() { Z80._r.l--; Z80._r.l&=255; Z80._r.f=Z80._r.l?0:0x80; Z80._r.m=1; },
    DECr_a: function() { Z80._r.a--; Z80._r.a&=255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    DECHLm: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l)-1; i&=255; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.f=i?0:0x80; Z80._r.m=3; },

    INCBC: function() { Z80._r.c=(Z80._r.c+1)&255; if(!Z80._r.c) Z80._r.b=(Z80._r.b+1)&255; Z80._r.m=1; },
    INCDE: function() { Z80._r.e=(Z80._r.e+1)&255; if(!Z80._r.e) Z80._r.d=(Z80._r.d+1)&255; Z80._r.m=1; },
    INCHL: function() { Z80._r.l=(Z80._r.l+1)&255; if(!Z80._r.l) Z80._r.h=(Z80._r.h+1)&255; Z80._r.m=1; },
    INCSP: function() { Z80._r.sp=(Z80._r.sp+1)&65535; Z80._r.m=1; },

    DECBC: function() { Z80._r.c=(Z80._r.c-1)&255; if(Z80._r.c==255) Z80._r.b=(Z80._r.b-1)&255; Z80._r.m=1; },
    DECDE: function() { Z80._r.e=(Z80._r.e-1)&255; if(Z80._r.e==255) Z80._r.d=(Z80._r.d-1)&255; Z80._r.m=1; },
    DECHL: function() { Z80._r.l=(Z80._r.l-1)&255; if(Z80._r.l==255) Z80._r.h=(Z80._r.h-1)&255; Z80._r.m=1; },
    DECSP: function() { Z80._r.sp=(Z80._r.sp-1)&65535; Z80._r.m=1; },

    /*--- Bit manipulation ---*/
    BIT0b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x01)?0:0x80; Z80._r.m=2; },
    BIT0c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x01)?0:0x80; Z80._r.m=2; },
    BIT0d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x01)?0:0x80; Z80._r.m=2; },
    BIT0e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x01)?0:0x80; Z80._r.m=2; },
    BIT0h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x01)?0:0x80; Z80._r.m=2; },
    BIT0l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x01)?0:0x80; Z80._r.m=2; },
    BIT0a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x01)?0:0x80; Z80._r.m=2; },
    BIT0m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x01)?0:0x80; Z80._r.m=3; },

    RES0b: function() { Z80._r.b&=0xFE; Z80._r.m=2; },
    RES0c: function() { Z80._r.c&=0xFE; Z80._r.m=2; },
    RES0d: function() { Z80._r.d&=0xFE; Z80._r.m=2; },
    RES0e: function() { Z80._r.e&=0xFE; Z80._r.m=2; },
    RES0h: function() { Z80._r.h&=0xFE; Z80._r.m=2; },
    RES0l: function() { Z80._r.l&=0xFE; Z80._r.m=2; },
    RES0a: function() { Z80._r.a&=0xFE; Z80._r.m=2; },
    RES0m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0xFE; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET0b: function() { Z80._r.b|=0x01; Z80._r.m=2; },
    SET0c: function() { Z80._r.b|=0x01; Z80._r.m=2; },
    SET0d: function() { Z80._r.b|=0x01; Z80._r.m=2; },
    SET0e: function() { Z80._r.b|=0x01; Z80._r.m=2; },
    SET0h: function() { Z80._r.b|=0x01; Z80._r.m=2; },
    SET0l: function() { Z80._r.b|=0x01; Z80._r.m=2; },
    SET0a: function() { Z80._r.b|=0x01; Z80._r.m=2; },
    SET0m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x01; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    BIT1b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x02)?0:0x80; Z80._r.m=2; },
    BIT1c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x02)?0:0x80; Z80._r.m=2; },
    BIT1d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x02)?0:0x80; Z80._r.m=2; },
    BIT1e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x02)?0:0x80; Z80._r.m=2; },
    BIT1h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x02)?0:0x80; Z80._r.m=2; },
    BIT1l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x02)?0:0x80; Z80._r.m=2; },
    BIT1a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x02)?0:0x80; Z80._r.m=2; },
    BIT1m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x02)?0:0x80; Z80._r.m=3; },

    RES1b: function() { Z80._r.b&=0xFD; Z80._r.m=2; },
    RES1c: function() { Z80._r.c&=0xFD; Z80._r.m=2; },
    RES1d: function() { Z80._r.d&=0xFD; Z80._r.m=2; },
    RES1e: function() { Z80._r.e&=0xFD; Z80._r.m=2; },
    RES1h: function() { Z80._r.h&=0xFD; Z80._r.m=2; },
    RES1l: function() { Z80._r.l&=0xFD; Z80._r.m=2; },
    RES1a: function() { Z80._r.a&=0xFD; Z80._r.m=2; },
    RES1m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0xFD; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET1b: function() { Z80._r.b|=0x02; Z80._r.m=2; },
    SET1c: function() { Z80._r.b|=0x02; Z80._r.m=2; },
    SET1d: function() { Z80._r.b|=0x02; Z80._r.m=2; },
    SET1e: function() { Z80._r.b|=0x02; Z80._r.m=2; },
    SET1h: function() { Z80._r.b|=0x02; Z80._r.m=2; },
    SET1l: function() { Z80._r.b|=0x02; Z80._r.m=2; },
    SET1a: function() { Z80._r.b|=0x02; Z80._r.m=2; },
    SET1m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x02; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    BIT2b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x04)?0:0x80; Z80._r.m=2; },
    BIT2c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x04)?0:0x80; Z80._r.m=2; },
    BIT2d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x04)?0:0x80; Z80._r.m=2; },
    BIT2e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x04)?0:0x80; Z80._r.m=2; },
    BIT2h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x04)?0:0x80; Z80._r.m=2; },
    BIT2l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x04)?0:0x80; Z80._r.m=2; },
    BIT2a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x04)?0:0x80; Z80._r.m=2; },
    BIT2m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x04)?0:0x80; Z80._r.m=3; },

    RES2b: function() { Z80._r.b&=0xFB; Z80._r.m=2; },
    RES2c: function() { Z80._r.c&=0xFB; Z80._r.m=2; },
    RES2d: function() { Z80._r.d&=0xFB; Z80._r.m=2; },
    RES2e: function() { Z80._r.e&=0xFB; Z80._r.m=2; },
    RES2h: function() { Z80._r.h&=0xFB; Z80._r.m=2; },
    RES2l: function() { Z80._r.l&=0xFB; Z80._r.m=2; },
    RES2a: function() { Z80._r.a&=0xFB; Z80._r.m=2; },
    RES2m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0xFB; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET2b: function() { Z80._r.b|=0x04; Z80._r.m=2; },
    SET2c: function() { Z80._r.b|=0x04; Z80._r.m=2; },
    SET2d: function() { Z80._r.b|=0x04; Z80._r.m=2; },
    SET2e: function() { Z80._r.b|=0x04; Z80._r.m=2; },
    SET2h: function() { Z80._r.b|=0x04; Z80._r.m=2; },
    SET2l: function() { Z80._r.b|=0x04; Z80._r.m=2; },
    SET2a: function() { Z80._r.b|=0x04; Z80._r.m=2; },
    SET2m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x04; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    BIT3b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x08)?0:0x80; Z80._r.m=2; },
    BIT3c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x08)?0:0x80; Z80._r.m=2; },
    BIT3d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x08)?0:0x80; Z80._r.m=2; },
    BIT3e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x08)?0:0x80; Z80._r.m=2; },
    BIT3h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x08)?0:0x80; Z80._r.m=2; },
    BIT3l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x08)?0:0x80; Z80._r.m=2; },
    BIT3a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x08)?0:0x80; Z80._r.m=2; },
    BIT3m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x08)?0:0x80; Z80._r.m=3; },

    RES3b: function() { Z80._r.b&=0xF7; Z80._r.m=2; },
    RES3c: function() { Z80._r.c&=0xF7; Z80._r.m=2; },
    RES3d: function() { Z80._r.d&=0xF7; Z80._r.m=2; },
    RES3e: function() { Z80._r.e&=0xF7; Z80._r.m=2; },
    RES3h: function() { Z80._r.h&=0xF7; Z80._r.m=2; },
    RES3l: function() { Z80._r.l&=0xF7; Z80._r.m=2; },
    RES3a: function() { Z80._r.a&=0xF7; Z80._r.m=2; },
    RES3m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0xF7; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET3b: function() { Z80._r.b|=0x08; Z80._r.m=2; },
    SET3c: function() { Z80._r.b|=0x08; Z80._r.m=2; },
    SET3d: function() { Z80._r.b|=0x08; Z80._r.m=2; },
    SET3e: function() { Z80._r.b|=0x08; Z80._r.m=2; },
    SET3h: function() { Z80._r.b|=0x08; Z80._r.m=2; },
    SET3l: function() { Z80._r.b|=0x08; Z80._r.m=2; },
    SET3a: function() { Z80._r.b|=0x08; Z80._r.m=2; },
    SET3m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x08; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    BIT4b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x10)?0:0x80; Z80._r.m=2; },
    BIT4c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x10)?0:0x80; Z80._r.m=2; },
    BIT4d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x10)?0:0x80; Z80._r.m=2; },
    BIT4e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x10)?0:0x80; Z80._r.m=2; },
    BIT4h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x10)?0:0x80; Z80._r.m=2; },
    BIT4l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x10)?0:0x80; Z80._r.m=2; },
    BIT4a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x10)?0:0x80; Z80._r.m=2; },
    BIT4m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x10)?0:0x80; Z80._r.m=3; },

    RES4b: function() { Z80._r.b&=0xEF; Z80._r.m=2; },
    RES4c: function() { Z80._r.c&=0xEF; Z80._r.m=2; },
    RES4d: function() { Z80._r.d&=0xEF; Z80._r.m=2; },
    RES4e: function() { Z80._r.e&=0xEF; Z80._r.m=2; },
    RES4h: function() { Z80._r.h&=0xEF; Z80._r.m=2; },
    RES4l: function() { Z80._r.l&=0xEF; Z80._r.m=2; },
    RES4a: function() { Z80._r.a&=0xEF; Z80._r.m=2; },
    RES4m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0xEF; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET4b: function() { Z80._r.b|=0x10; Z80._r.m=2; },
    SET4c: function() { Z80._r.b|=0x10; Z80._r.m=2; },
    SET4d: function() { Z80._r.b|=0x10; Z80._r.m=2; },
    SET4e: function() { Z80._r.b|=0x10; Z80._r.m=2; },
    SET4h: function() { Z80._r.b|=0x10; Z80._r.m=2; },
    SET4l: function() { Z80._r.b|=0x10; Z80._r.m=2; },
    SET4a: function() { Z80._r.b|=0x10; Z80._r.m=2; },
    SET4m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x10; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    BIT5b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x20)?0:0x80; Z80._r.m=2; },
    BIT5c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x20)?0:0x80; Z80._r.m=2; },
    BIT5d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x20)?0:0x80; Z80._r.m=2; },
    BIT5e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x20)?0:0x80; Z80._r.m=2; },
    BIT5h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x20)?0:0x80; Z80._r.m=2; },
    BIT5l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x20)?0:0x80; Z80._r.m=2; },
    BIT5a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x20)?0:0x80; Z80._r.m=2; },
    BIT5m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x20)?0:0x80; Z80._r.m=3; },

    RES5b: function() { Z80._r.b&=0xDF; Z80._r.m=2; },
    RES5c: function() { Z80._r.c&=0xDF; Z80._r.m=2; },
    RES5d: function() { Z80._r.d&=0xDF; Z80._r.m=2; },
    RES5e: function() { Z80._r.e&=0xDF; Z80._r.m=2; },
    RES5h: function() { Z80._r.h&=0xDF; Z80._r.m=2; },
    RES5l: function() { Z80._r.l&=0xDF; Z80._r.m=2; },
    RES5a: function() { Z80._r.a&=0xDF; Z80._r.m=2; },
    RES5m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0xDF; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET5b: function() { Z80._r.b|=0x20; Z80._r.m=2; },
    SET5c: function() { Z80._r.b|=0x20; Z80._r.m=2; },
    SET5d: function() { Z80._r.b|=0x20; Z80._r.m=2; },
    SET5e: function() { Z80._r.b|=0x20; Z80._r.m=2; },
    SET5h: function() { Z80._r.b|=0x20; Z80._r.m=2; },
    SET5l: function() { Z80._r.b|=0x20; Z80._r.m=2; },
    SET5a: function() { Z80._r.b|=0x20; Z80._r.m=2; },
    SET5m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x20; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    BIT6b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x40)?0:0x80; Z80._r.m=2; },
    BIT6c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x40)?0:0x80; Z80._r.m=2; },
    BIT6d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x40)?0:0x80; Z80._r.m=2; },
    BIT6e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x40)?0:0x80; Z80._r.m=2; },
    BIT6h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x40)?0:0x80; Z80._r.m=2; },
    BIT6l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x40)?0:0x80; Z80._r.m=2; },
    BIT6a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x40)?0:0x80; Z80._r.m=2; },
    BIT6m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x40)?0:0x80; Z80._r.m=3; },

    RES6b: function() { Z80._r.b&=0xBF; Z80._r.m=2; },
    RES6c: function() { Z80._r.c&=0xBF; Z80._r.m=2; },
    RES6d: function() { Z80._r.d&=0xBF; Z80._r.m=2; },
    RES6e: function() { Z80._r.e&=0xBF; Z80._r.m=2; },
    RES6h: function() { Z80._r.h&=0xBF; Z80._r.m=2; },
    RES6l: function() { Z80._r.l&=0xBF; Z80._r.m=2; },
    RES6a: function() { Z80._r.a&=0xBF; Z80._r.m=2; },
    RES6m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0xBF; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET6b: function() { Z80._r.b|=0x40; Z80._r.m=2; },
    SET6c: function() { Z80._r.b|=0x40; Z80._r.m=2; },
    SET6d: function() { Z80._r.b|=0x40; Z80._r.m=2; },
    SET6e: function() { Z80._r.b|=0x40; Z80._r.m=2; },
    SET6h: function() { Z80._r.b|=0x40; Z80._r.m=2; },
    SET6l: function() { Z80._r.b|=0x40; Z80._r.m=2; },
    SET6a: function() { Z80._r.b|=0x40; Z80._r.m=2; },
    SET6m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x40; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    BIT7b: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.b&0x80)?0:0x80; Z80._r.m=2; },
    BIT7c: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.c&0x80)?0:0x80; Z80._r.m=2; },
    BIT7d: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.d&0x80)?0:0x80; Z80._r.m=2; },
    BIT7e: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.e&0x80)?0:0x80; Z80._r.m=2; },
    BIT7h: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.h&0x80)?0:0x80; Z80._r.m=2; },
    BIT7l: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.l&0x80)?0:0x80; Z80._r.m=2; },
    BIT7a: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(Z80._r.a&0x80)?0:0x80; Z80._r.m=2; },
    BIT7m: function() { Z80._r.f&=0x1F; Z80._r.f|=0x20; Z80._r.f=(MMU.rb((Z80._r.h<<8)+Z80._r.l)&0x80)?0:0x80; Z80._r.m=3; },

    RES7b: function() { Z80._r.b&=0x7F; Z80._r.m=2; },
    RES7c: function() { Z80._r.c&=0x7F; Z80._r.m=2; },
    RES7d: function() { Z80._r.d&=0x7F; Z80._r.m=2; },
    RES7e: function() { Z80._r.e&=0x7F; Z80._r.m=2; },
    RES7h: function() { Z80._r.h&=0x7F; Z80._r.m=2; },
    RES7l: function() { Z80._r.l&=0x7F; Z80._r.m=2; },
    RES7a: function() { Z80._r.a&=0x7F; Z80._r.m=2; },
    RES7m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i&=0x7F; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    SET7b: function() { Z80._r.b|=0x80; Z80._r.m=2; },
    SET7c: function() { Z80._r.b|=0x80; Z80._r.m=2; },
    SET7d: function() { Z80._r.b|=0x80; Z80._r.m=2; },
    SET7e: function() { Z80._r.b|=0x80; Z80._r.m=2; },
    SET7h: function() { Z80._r.b|=0x80; Z80._r.m=2; },
    SET7l: function() { Z80._r.b|=0x80; Z80._r.m=2; },
    SET7a: function() { Z80._r.b|=0x80; Z80._r.m=2; },
    SET7m: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); i|=0x80; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.m=4; },

    RLA: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.a&0x80?0x10:0; Z80._r.a=(Z80._r.a<<1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=1; },
    RLCA: function() { var ci=Z80._r.a&0x80?1:0; var co=Z80._r.a&0x80?0x10:0; Z80._r.a=(Z80._r.a<<1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=1; },
    RRA: function() { debugMessage('RRA!'); jsGB.debug(); var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.a&1?0x10:0; Z80._r.a=(Z80._r.a>>1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=1; jsGB.pause();},
    RRCA: function() { var ci=Z80._r.a&1?0x80:0; var co=Z80._r.a&1?0x10:0; Z80._r.a=(Z80._r.a>>1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=1; },

    RLr_b: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.b&0x80?0x10:0; Z80._r.b=(Z80._r.b<<1)+ci; Z80._r.b&=255; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLr_c: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.c&0x80?0x10:0; Z80._r.c=(Z80._r.c<<1)+ci; Z80._r.c&=255; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLr_d: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.d&0x80?0x10:0; Z80._r.d=(Z80._r.d<<1)+ci; Z80._r.d&=255; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLr_e: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.e&0x80?0x10:0; Z80._r.e=(Z80._r.e<<1)+ci; Z80._r.e&=255; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLr_h: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.h&0x80?0x10:0; Z80._r.h=(Z80._r.h<<1)+ci; Z80._r.h&=255; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLr_l: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.l&0x80?0x10:0; Z80._r.l=(Z80._r.l<<1)+ci; Z80._r.l&=255; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLr_a: function() { var ci=Z80._r.f&0x10?1:0; var co=Z80._r.a&0x80?0x10:0; Z80._r.a=(Z80._r.a<<1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLHL: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); var ci=Z80._r.f&0x10?1:0; var co=i&0x80?0x10:0; i=(i<<1)+ci; i&=255; Z80._r.f=(i)?0:0x80; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=4; },

    RLCr_b: function() { var ci=Z80._r.b&0x80?1:0; var co=Z80._r.b&0x80?0x10:0; Z80._r.b=(Z80._r.b<<1)+ci; Z80._r.b&=255; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLCr_c: function() { var ci=Z80._r.c&0x80?1:0; var co=Z80._r.c&0x80?0x10:0; Z80._r.c=(Z80._r.c<<1)+ci; Z80._r.c&=255; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLCr_d: function() { var ci=Z80._r.d&0x80?1:0; var co=Z80._r.d&0x80?0x10:0; Z80._r.d=(Z80._r.d<<1)+ci; Z80._r.d&=255; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLCr_e: function() { var ci=Z80._r.e&0x80?1:0; var co=Z80._r.e&0x80?0x10:0; Z80._r.e=(Z80._r.e<<1)+ci; Z80._r.e&=255; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLCr_h: function() { var ci=Z80._r.h&0x80?1:0; var co=Z80._r.h&0x80?0x10:0; Z80._r.h=(Z80._r.h<<1)+ci; Z80._r.h&=255; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLCr_l: function() { var ci=Z80._r.l&0x80?1:0; var co=Z80._r.l&0x80?0x10:0; Z80._r.l=(Z80._r.l<<1)+ci; Z80._r.l&=255; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLCr_a: function() { var ci=Z80._r.a&0x80?1:0; var co=Z80._r.a&0x80?0x10:0; Z80._r.a=(Z80._r.a<<1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RLCHL: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); var ci=i&0x80?1:0; var co=i&0x80?0x10:0; i=(i<<1)+ci; i&=255; Z80._r.f=(i)?0:0x80; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=4; },

    RRr_b: function() { var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.b&1?0x10:0; Z80._r.b=(Z80._r.b>>1)+ci; Z80._r.b&=255; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRr_c: function() { var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.c&1?0x10:0; Z80._r.c=(Z80._r.c>>1)+ci; Z80._r.c&=255; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRr_d: function() { var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.d&1?0x10:0; Z80._r.d=(Z80._r.d>>1)+ci; Z80._r.d&=255; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRr_e: function() { var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.e&1?0x10:0; Z80._r.e=(Z80._r.e>>1)+ci; Z80._r.e&=255; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRr_h: function() { var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.h&1?0x10:0; Z80._r.h=(Z80._r.h>>1)+ci; Z80._r.h&=255; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRr_l: function() { var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.l&1?0x10:0; Z80._r.l=(Z80._r.l>>1)+ci; Z80._r.l&=255; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRr_a: function() { var ci=Z80._r.f&0x10?0x80:0; var co=Z80._r.a&1?0x10:0; Z80._r.a=(Z80._r.a>>1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRHL: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); var ci=Z80._r.f&0x10?0x80:0; var co=i&1?0x10:0; i=(i>>1)+ci; i&=255; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.f=(i)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=4; },

    RRCr_b: function() { var ci=Z80._r.b&1?0x80:0; var co=Z80._r.b&1?0x10:0; Z80._r.b=(Z80._r.b>>1)+ci; Z80._r.b&=255; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRCr_c: function() { var ci=Z80._r.c&1?0x80:0; var co=Z80._r.c&1?0x10:0; Z80._r.c=(Z80._r.c>>1)+ci; Z80._r.c&=255; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRCr_d: function() { var ci=Z80._r.d&1?0x80:0; var co=Z80._r.d&1?0x10:0; Z80._r.d=(Z80._r.d>>1)+ci; Z80._r.d&=255; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRCr_e: function() { var ci=Z80._r.e&1?0x80:0; var co=Z80._r.e&1?0x10:0; Z80._r.e=(Z80._r.e>>1)+ci; Z80._r.e&=255; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRCr_h: function() { var ci=Z80._r.h&1?0x80:0; var co=Z80._r.h&1?0x10:0; Z80._r.h=(Z80._r.h>>1)+ci; Z80._r.h&=255; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRCr_l: function() { var ci=Z80._r.l&1?0x80:0; var co=Z80._r.l&1?0x10:0; Z80._r.l=(Z80._r.l>>1)+ci; Z80._r.l&=255; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRCr_a: function() { var ci=Z80._r.a&1?0x80:0; var co=Z80._r.a&1?0x10:0; Z80._r.a=(Z80._r.a>>1)+ci; Z80._r.a&=255; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    RRCHL: function() { var i=MMU.rb((Z80._r.h<<8)+Z80._r.l); var ci=i&1?0x80:0; var co=i&1?0x10:0; i=(i>>1)+ci; i&=255; MMU.wb((Z80._r.h<<8)+Z80._r.l,i); Z80._r.f=(i)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=4; },

    SLAr_b: function() { var co=Z80._r.b&0x80?0x10:0; Z80._r.b=(Z80._r.b<<1)&255; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLAr_c: function() { var co=Z80._r.c&0x80?0x10:0; Z80._r.c=(Z80._r.c<<1)&255; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLAr_d: function() { var co=Z80._r.d&0x80?0x10:0; Z80._r.d=(Z80._r.d<<1)&255; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLAr_e: function() { var co=Z80._r.e&0x80?0x10:0; Z80._r.e=(Z80._r.e<<1)&255; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLAr_h: function() { var co=Z80._r.h&0x80?0x10:0; Z80._r.h=(Z80._r.h<<1)&255; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLAr_l: function() { var co=Z80._r.l&0x80?0x10:0; Z80._r.l=(Z80._r.l<<1)&255; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLAr_a: function() { var co=Z80._r.a&0x80?0x10:0; Z80._r.a=(Z80._r.a<<1)&255; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },

    SLLr_b: function() { var co=Z80._r.b&0x80?0x10:0; Z80._r.b=(Z80._r.b<<1)&255+1; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLLr_c: function() { var co=Z80._r.c&0x80?0x10:0; Z80._r.c=(Z80._r.c<<1)&255+1; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLLr_d: function() { var co=Z80._r.d&0x80?0x10:0; Z80._r.d=(Z80._r.d<<1)&255+1; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLLr_e: function() { var co=Z80._r.e&0x80?0x10:0; Z80._r.e=(Z80._r.e<<1)&255+1; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLLr_h: function() { var co=Z80._r.h&0x80?0x10:0; Z80._r.h=(Z80._r.h<<1)&255+1; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLLr_l: function() { var co=Z80._r.l&0x80?0x10:0; Z80._r.l=(Z80._r.l<<1)&255+1; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SLLr_a: function() { var co=Z80._r.a&0x80?0x10:0; Z80._r.a=(Z80._r.a<<1)&255+1; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },

    SRAr_b: function() { var ci=Z80._r.b&0x80; var co=Z80._r.b&1?0x10:0; Z80._r.b=((Z80._r.b>>1)+ci)&255; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRAr_c: function() { var ci=Z80._r.c&0x80; var co=Z80._r.c&1?0x10:0; Z80._r.c=((Z80._r.c>>1)+ci)&255; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRAr_d: function() { var ci=Z80._r.d&0x80; var co=Z80._r.d&1?0x10:0; Z80._r.d=((Z80._r.d>>1)+ci)&255; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRAr_e: function() { var ci=Z80._r.e&0x80; var co=Z80._r.e&1?0x10:0; Z80._r.e=((Z80._r.e>>1)+ci)&255; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRAr_h: function() { var ci=Z80._r.h&0x80; var co=Z80._r.h&1?0x10:0; Z80._r.h=((Z80._r.h>>1)+ci)&255; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRAr_l: function() { var ci=Z80._r.l&0x80; var co=Z80._r.l&1?0x10:0; Z80._r.l=((Z80._r.l>>1)+ci)&255; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRAr_a: function() { var ci=Z80._r.a&0x80; var co=Z80._r.a&1?0x10:0; Z80._r.a=((Z80._r.a>>1)+ci)&255; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },

    SRLr_b: function() { var co=Z80._r.b&1?0x10:0; Z80._r.b=(Z80._r.b>>1)&255; Z80._r.f=(Z80._r.b)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRLr_c: function() { var co=Z80._r.c&1?0x10:0; Z80._r.c=(Z80._r.c>>1)&255; Z80._r.f=(Z80._r.c)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRLr_d: function() { var co=Z80._r.d&1?0x10:0; Z80._r.d=(Z80._r.d>>1)&255; Z80._r.f=(Z80._r.d)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRLr_e: function() { var co=Z80._r.e&1?0x10:0; Z80._r.e=(Z80._r.e>>1)&255; Z80._r.f=(Z80._r.e)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRLr_h: function() { var co=Z80._r.h&1?0x10:0; Z80._r.h=(Z80._r.h>>1)&255; Z80._r.f=(Z80._r.h)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRLr_l: function() { var co=Z80._r.l&1?0x10:0; Z80._r.l=(Z80._r.l>>1)&255; Z80._r.f=(Z80._r.l)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },
    SRLr_a: function() { var co=Z80._r.a&1?0x10:0; Z80._r.a=(Z80._r.a>>1)&255; Z80._r.f=(Z80._r.a)?0:0x80; Z80._r.f=(Z80._r.f&0xEF)+co; Z80._r.m=2; },

    CPL: function() { Z80._r.a ^= 255; Z80._r.f=Z80._r.a?0:0x80; Z80._r.m=1; },
    NEG: function() { Z80._r.a=0-Z80._r.a; Z80._r.f=(Z80._r.a<0)?0x10:0; Z80._r.a&=255; if(!Z80._r.a) Z80._r.f|=0x80; Z80._r.m=2; },

    CCF: function() { var ci=Z80._r.f&0x10?0:0x10; Z80._r.f=(Z80._r.f&0xEF)+ci; Z80._r.m=1; },
    SCF: function() { Z80._r.f|=0x10; Z80._r.m=1; },

    /*--- Stack ---*/
    PUSHBC: function() { Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.b); Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.c); Z80._r.m=3; },
    PUSHDE: function() { Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.d); Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.e); Z80._r.m=3; },
    PUSHHL: function() { Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.h); Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.l); Z80._r.m=3; },
    PUSHAF: function() { Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.a); Z80._r.sp--; MMU.wb(Z80._r.sp,Z80._r.f); Z80._r.m=3; },

    POPBC: function() { Z80._r.c=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.b=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.m=3; },
    POPDE: function() { Z80._r.e=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.d=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.m=3; },
    POPHL: function() { Z80._r.l=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.h=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.m=3; },
    POPAF: function() { Z80._r.f=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.a=MMU.rb(Z80._r.sp); Z80._r.sp++; Z80._r.m=3; },

    /*--- Jump ---*/
    JPnn: function() { Z80._r.pc = MMU.rw(Z80._r.pc); Z80._r.m=3; },
    JPHL: function() { Z80._r.pc=(Z80._r.h<<8)+Z80._r.l; Z80._r.m=1; },
    JPNZnn: function() { Z80._r.m=3; if((Z80._r.f&0x80)==0x00) { Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m++; } else Z80._r.pc+=2; },
    JPZnn: function()  { Z80._r.m=3; if((Z80._r.f&0x80)==0x80) { Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m++; } else Z80._r.pc+=2; },
    JPNCnn: function() { Z80._r.m=3; if((Z80._r.f&0x10)==0x00) { Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m++; } else Z80._r.pc+=2; },
    JPCnn: function()  { Z80._r.m=3; if((Z80._r.f&0x10)==0x10) { Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m++; } else Z80._r.pc+=2; },

    JRn: function() { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; Z80._r.m=2; Z80._r.pc+=i; Z80._r.m++; },
    JRNZn: function() { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; Z80._r.m=2; if((Z80._r.f&0x80)==0x00) { Z80._r.pc+=i; Z80._r.m++; } },
    JRZn: function()  { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; Z80._r.m=2; if((Z80._r.f&0x80)==0x80) { Z80._r.pc+=i; Z80._r.m++; } },
    JRNCn: function() { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; Z80._r.m=2; if((Z80._r.f&0x10)==0x00) { Z80._r.pc+=i; Z80._r.m++; } },
    JRCn: function()  { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; Z80._r.m=2; if((Z80._r.f&0x10)==0x10) { Z80._r.pc+=i; Z80._r.m++; } },

    DJNZn: function() { var i=MMU.rb(Z80._r.pc); if(i>127) i=-((~i+1)&255); Z80._r.pc++; Z80._r.m=2; Z80._r.b--; if(Z80._r.b) { Z80._r.pc+=i; Z80._r.m++; } },

    CALLnn: function() { Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc+2); Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m=5; },
    CALLNZnn: function() { Z80._r.m=3; if((Z80._r.f&0x80)==0x00) { Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc+2); Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m+=2; } else Z80._r.pc+=2; },
    CALLZnn: function() { Z80._r.m=3; if((Z80._r.f&0x80)==0x80) { Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc+2); Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m+=2; } else Z80._r.pc+=2; },
    CALLNCnn: function() { Z80._r.m=3; if((Z80._r.f&0x10)==0x00) { Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc+2); Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m+=2; } else Z80._r.pc+=2; },
    CALLCnn: function() { Z80._r.m=3; if((Z80._r.f&0x10)==0x10) { Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc+2); Z80._r.pc=MMU.rw(Z80._r.pc); Z80._r.m+=2; } else Z80._r.pc+=2; },

    RET: function() { Z80._r.pc=MMU.rw(Z80._r.sp); Z80._r.sp+=2; Z80._r.m=3; },
    RETI: function() { Z80._r.ime=1; Z80._ops.rrs(); Z80._r.pc=MMU.rw(Z80._r.sp); Z80._r.sp+=2; Z80._r.m=3; },
    RETNZ: function() { Z80._r.m=1; if((Z80._r.f&0x80)==0x00) { Z80._r.pc=MMU.rw(Z80._r.sp); Z80._r.sp+=2; Z80._r.m+=2; } },
    RETZ: function() { Z80._r.m=1; if((Z80._r.f&0x80)==0x80) { Z80._r.pc=MMU.rw(Z80._r.sp); Z80._r.sp+=2; Z80._r.m+=2; } },
    RETNC: function() { Z80._r.m=1; if((Z80._r.f&0x10)==0x00) { Z80._r.pc=MMU.rw(Z80._r.sp); Z80._r.sp+=2; Z80._r.m+=2; } },
    RETC: function() { Z80._r.m=1; if((Z80._r.f&0x10)==0x10) { Z80._r.pc=MMU.rw(Z80._r.sp); Z80._r.sp+=2; Z80._r.m+=2; } },

    RST00: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x00; Z80._r.m=3; },
    RST08: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x08; Z80._r.m=3; },
    RST10: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x10; Z80._r.m=3; },
    RST18: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x18; Z80._r.m=3; },
    RST20: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x20; Z80._r.m=3; },
    RST28: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x28; Z80._r.m=3; },
    RST30: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x30; Z80._r.m=3; },
    RST38: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x38; Z80._r.m=3; },
    RST40: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x40; Z80._r.m=3; },
    RST48: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x48; Z80._r.m=3; },
    RST50: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x50; Z80._r.m=3; },
    RST58: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x58; Z80._r.m=3; },
    RST60: function() { Z80._ops.rsv(); Z80._r.sp-=2; MMU.ww(Z80._r.sp,Z80._r.pc); Z80._r.pc=0x60; Z80._r.m=3; },

    NOP: function() { Z80._r.m=1; },
    HALT: function() { Z80._halt=1; Z80._r.m=1; },

    DI: function() { Z80._r.ime=0; Z80._r.m=1; },
    EI: function() { Z80._r.ime=1; Z80._r.m=1; },

    /*--- Helper functions ---*/
    rsv: function() {
      Z80._rsv.a = Z80._r.a; Z80._rsv.b = Z80._r.b;
      Z80._rsv.c = Z80._r.c; Z80._rsv.d = Z80._r.d;
      Z80._rsv.e = Z80._r.e; Z80._rsv.f = Z80._r.f;
      Z80._rsv.h = Z80._r.h; Z80._rsv.l = Z80._r.l;
    },

    rrs: function() {
      Z80._r.a = Z80._rsv.a; Z80._r.b = Z80._rsv.b;
      Z80._r.c = Z80._rsv.c; Z80._r.d = Z80._rsv.d;
      Z80._r.e = Z80._rsv.e; Z80._r.f = Z80._rsv.f;
      Z80._r.h = Z80._rsv.h; Z80._r.l = Z80._rsv.l;
    },

    MAPcb: function() {
      var i=MMU.rb(Z80._r.pc); Z80._r.pc++;
      Z80._r.pc &= 65535;
      if(Z80._cbmap[i]) Z80._cbmap[i]();
      else debugMessage(i);
    },

    XX: function() {
      /*Undefined map entry*/
      var opc = Z80._r.pc-1;
      debugMessage('Z80', 'Unimplemented instruction at $'+opc.toString(16)+', stopping.');
      Z80._stop=1;
    }
  },

  _map: [],
  _cbmap: []
};

Z80._map = [
  // 00
  Z80._ops.NOP,		Z80._ops.LDBCnn,	Z80._ops.LDBCmA,	Z80._ops.INCBC,
  Z80._ops.INCr_b,	Z80._ops.DECr_b,	Z80._ops.LDrn_b,	Z80._ops.RLCA,
  Z80._ops.LDmmSP,	Z80._ops.ADDHLBC,	Z80._ops.LDABCm,	Z80._ops.DECBC,
  Z80._ops.INCr_c,	Z80._ops.DECr_c,	Z80._ops.LDrn_c,	Z80._ops.RRCA,
  // 10
  Z80._ops.DJNZn,	Z80._ops.LDDEnn,	Z80._ops.LDDEmA,	Z80._ops.INCDE,
  Z80._ops.INCr_d,	Z80._ops.DECr_d,	Z80._ops.LDrn_d,	Z80._ops.RLA,
  Z80._ops.JRn,		Z80._ops.ADDHLDE,	Z80._ops.LDADEm,	Z80._ops.DECDE,
  Z80._ops.INCr_e,	Z80._ops.DECr_e,	Z80._ops.LDrn_e,	Z80._ops.RRA,
  // 20
  Z80._ops.JRNZn,	Z80._ops.LDHLnn,	Z80._ops.LDHLIA,	Z80._ops.INCHL,
  Z80._ops.INCr_h,	Z80._ops.DECr_h,	Z80._ops.LDrn_h,	Z80._ops.DAA,
  Z80._ops.JRZn,	Z80._ops.ADDHLHL,	Z80._ops.LDAHLI,	Z80._ops.DECHL,
  Z80._ops.INCr_l,	Z80._ops.DECr_l,	Z80._ops.LDrn_l,	Z80._ops.CPL,
  // 30
  Z80._ops.JRNCn,	Z80._ops.LDSPnn,	Z80._ops.LDHLDA,	Z80._ops.INCSP,
  Z80._ops.INCHLm,	Z80._ops.DECHLm,	Z80._ops.LDHLmn,	Z80._ops.SCF,
  Z80._ops.JRCn,	Z80._ops.ADDHLSP,	Z80._ops.LDAHLD,	Z80._ops.DECSP,
  Z80._ops.INCr_a,	Z80._ops.DECr_a,	Z80._ops.LDrn_a,	Z80._ops.CCF,
  // 40
  Z80._ops.LDrr_bb,	Z80._ops.LDrr_bc,	Z80._ops.LDrr_bd,	Z80._ops.LDrr_be,
  Z80._ops.LDrr_bh,	Z80._ops.LDrr_bl,	Z80._ops.LDrHLm_b,	Z80._ops.LDrr_ba,
  Z80._ops.LDrr_cb,	Z80._ops.LDrr_cc,	Z80._ops.LDrr_cd,	Z80._ops.LDrr_ce,
  Z80._ops.LDrr_ch,	Z80._ops.LDrr_cl,	Z80._ops.LDrHLm_c,	Z80._ops.LDrr_ca,
  // 50
  Z80._ops.LDrr_db,	Z80._ops.LDrr_dc,	Z80._ops.LDrr_dd,	Z80._ops.LDrr_de,
  Z80._ops.LDrr_dh,	Z80._ops.LDrr_dl,	Z80._ops.LDrHLm_d,	Z80._ops.LDrr_da,
  Z80._ops.LDrr_eb,	Z80._ops.LDrr_ec,	Z80._ops.LDrr_ed,	Z80._ops.LDrr_ee,
  Z80._ops.LDrr_eh,	Z80._ops.LDrr_el,	Z80._ops.LDrHLm_e,	Z80._ops.LDrr_ea,
  // 60
  Z80._ops.LDrr_hb,	Z80._ops.LDrr_hc,	Z80._ops.LDrr_hd,	Z80._ops.LDrr_he,
  Z80._ops.LDrr_hh,	Z80._ops.LDrr_hl,	Z80._ops.LDrHLm_h,	Z80._ops.LDrr_ha,
  Z80._ops.LDrr_lb,	Z80._ops.LDrr_lc,	Z80._ops.LDrr_ld,	Z80._ops.LDrr_le,
  Z80._ops.LDrr_lh,	Z80._ops.LDrr_ll,	Z80._ops.LDrHLm_l,	Z80._ops.LDrr_la,
  // 70
  Z80._ops.LDHLmr_b,	Z80._ops.LDHLmr_c,	Z80._ops.LDHLmr_d,	Z80._ops.LDHLmr_e,
  Z80._ops.LDHLmr_h,	Z80._ops.LDHLmr_l,	Z80._ops.HALT,		Z80._ops.LDHLmr_a,
  Z80._ops.LDrr_ab,	Z80._ops.LDrr_ac,	Z80._ops.LDrr_ad,	Z80._ops.LDrr_ae,
  Z80._ops.LDrr_ah,	Z80._ops.LDrr_al,	Z80._ops.LDrHLm_a,	Z80._ops.LDrr_aa,
  // 80
  Z80._ops.ADDr_b,	Z80._ops.ADDr_c,	Z80._ops.ADDr_d,	Z80._ops.ADDr_e,
  Z80._ops.ADDr_h,	Z80._ops.ADDr_l,	Z80._ops.ADDHL,		Z80._ops.ADDr_a,
  Z80._ops.ADCr_b,	Z80._ops.ADCr_c,	Z80._ops.ADCr_d,	Z80._ops.ADCr_e,
  Z80._ops.ADCr_h,	Z80._ops.ADCr_l,	Z80._ops.ADCHL,		Z80._ops.ADCr_a,
  // 90
  Z80._ops.SUBr_b,	Z80._ops.SUBr_c,	Z80._ops.SUBr_d,	Z80._ops.SUBr_e,
  Z80._ops.SUBr_h,	Z80._ops.SUBr_l,	Z80._ops.SUBHL,		Z80._ops.SUBr_a,
  Z80._ops.SBCr_b,	Z80._ops.SBCr_c,	Z80._ops.SBCr_d,	Z80._ops.SBCr_e,
  Z80._ops.SBCr_h,	Z80._ops.SBCr_l,	Z80._ops.SBCHL,		Z80._ops.SBCr_a,
  // A0
  Z80._ops.ANDr_b,	Z80._ops.ANDr_c,	Z80._ops.ANDr_d,	Z80._ops.ANDr_e,
  Z80._ops.ANDr_h,	Z80._ops.ANDr_l,	Z80._ops.ANDHL,		Z80._ops.ANDr_a,
  Z80._ops.XORr_b,	Z80._ops.XORr_c,	Z80._ops.XORr_d,	Z80._ops.XORr_e,
  Z80._ops.XORr_h,	Z80._ops.XORr_l,	Z80._ops.XORHL,		Z80._ops.XORr_a,
  // B0
  Z80._ops.ORr_b,	Z80._ops.ORr_c,		Z80._ops.ORr_d,		Z80._ops.ORr_e,
  Z80._ops.ORr_h,	Z80._ops.ORr_l,		Z80._ops.ORHL,		Z80._ops.ORr_a,
  Z80._ops.CPr_b,	Z80._ops.CPr_c,		Z80._ops.CPr_d,		Z80._ops.CPr_e,
  Z80._ops.CPr_h,	Z80._ops.CPr_l,		Z80._ops.CPHL,		Z80._ops.CPr_a,
  // C0
  Z80._ops.RETNZ,	Z80._ops.POPBC,		Z80._ops.JPNZnn,	Z80._ops.JPnn,
  Z80._ops.CALLNZnn,	Z80._ops.PUSHBC,	Z80._ops.ADDn,		Z80._ops.RST00,
  Z80._ops.RETZ,	Z80._ops.RET,		Z80._ops.JPZnn,		Z80._ops.MAPcb,
  Z80._ops.CALLZnn,	Z80._ops.CALLnn,	Z80._ops.ADCn,		Z80._ops.RST08,
  // D0
  Z80._ops.RETNC,	Z80._ops.POPDE,		Z80._ops.JPNCnn,	Z80._ops.XX,
  Z80._ops.CALLNCnn,	Z80._ops.PUSHDE,	Z80._ops.SUBn,		Z80._ops.RST10,
  Z80._ops.RETC,	Z80._ops.RETI,		Z80._ops.JPCnn,		Z80._ops.XX,
  Z80._ops.CALLCnn,	Z80._ops.XX,		Z80._ops.SBCn,		Z80._ops.RST18,
  // E0
  Z80._ops.LDIOnA,	Z80._ops.POPHL,		Z80._ops.LDIOCA,	Z80._ops.XX,
  Z80._ops.XX,		Z80._ops.PUSHHL,	Z80._ops.ANDn,		Z80._ops.RST20,
  Z80._ops.ADDSPn,	Z80._ops.JPHL,		Z80._ops.LDmmA,		Z80._ops.XX,
  Z80._ops.XX,		Z80._ops.XX,		Z80._ops.XORn,		Z80._ops.RST28,
  // F0
  Z80._ops.LDAIOn,	Z80._ops.POPAF,		Z80._ops.LDAIOC,	Z80._ops.DI,
  Z80._ops.XX,		Z80._ops.PUSHAF,	Z80._ops.ORn,		Z80._ops.RST30,
  Z80._ops.LDHLSPn,	Z80._ops.XX,		Z80._ops.LDAmm,		Z80._ops.EI,
  Z80._ops.XX,		Z80._ops.XX,		Z80._ops.CPn,		Z80._ops.RST38
];

Z80._cbmap = [
  // CB00
  Z80._ops.RLCr_b,	Z80._ops.RLCr_c,	Z80._ops.RLCr_d,	Z80._ops.RLCr_e,
  Z80._ops.RLCr_h,	Z80._ops.RLCr_l,	Z80._ops.RLCHL,		Z80._ops.RLCr_a,
  Z80._ops.RRCr_b,	Z80._ops.RRCr_c,	Z80._ops.RRCr_d,	Z80._ops.RRCr_e,
  Z80._ops.RRCr_h,	Z80._ops.RRCr_l,	Z80._ops.RRCHL,		Z80._ops.RRCr_a,
  // CB10
  Z80._ops.RLr_b,	Z80._ops.RLr_c,		Z80._ops.RLr_d,		Z80._ops.RLr_e,
  Z80._ops.RLr_h,	Z80._ops.RLr_l,		Z80._ops.RLHL,		Z80._ops.RLr_a,
  Z80._ops.RRr_b,	Z80._ops.RRr_c,		Z80._ops.RRr_d,		Z80._ops.RRr_e,
  Z80._ops.RRr_h,	Z80._ops.RRr_l,		Z80._ops.RRHL,		Z80._ops.RRr_a,
  // CB20
  Z80._ops.SLAr_b,	Z80._ops.SLAr_c,	Z80._ops.SLAr_d,	Z80._ops.SLAr_e,
  Z80._ops.SLAr_h,	Z80._ops.SLAr_l,	Z80._ops.XX,		Z80._ops.SLAr_a,
  Z80._ops.SRAr_b,	Z80._ops.SRAr_c,	Z80._ops.SRAr_d,	Z80._ops.SRAr_e,
  Z80._ops.SRAr_h,	Z80._ops.SRAr_l,	Z80._ops.XX,		Z80._ops.SRAr_a,
  // CB30
  Z80._ops.SWAPr_b,	Z80._ops.SWAPr_c,	Z80._ops.SWAPr_d,	Z80._ops.SWAPr_e,
  Z80._ops.SWAPr_h,	Z80._ops.SWAPr_l,	Z80._ops.XX,		Z80._ops.SWAPr_a,
  Z80._ops.SRLr_b,	Z80._ops.SRLr_c,	Z80._ops.SRLr_d,	Z80._ops.SRLr_e,
  Z80._ops.SRLr_h,	Z80._ops.SRLr_l,	Z80._ops.XX,		Z80._ops.SRLr_a,
  // CB40
  Z80._ops.BIT0b,	Z80._ops.BIT0c,		Z80._ops.BIT0d,		Z80._ops.BIT0e,
  Z80._ops.BIT0h,	Z80._ops.BIT0l,		Z80._ops.BIT0m,		Z80._ops.BIT0a,
  Z80._ops.BIT1b,	Z80._ops.BIT1c,		Z80._ops.BIT1d,		Z80._ops.BIT1e,
  Z80._ops.BIT1h,	Z80._ops.BIT1l,		Z80._ops.BIT1m,		Z80._ops.BIT1a,
  // CB50
  Z80._ops.BIT2b,	Z80._ops.BIT2c,		Z80._ops.BIT2d,		Z80._ops.BIT2e,
  Z80._ops.BIT2h,	Z80._ops.BIT2l,		Z80._ops.BIT2m,		Z80._ops.BIT2a,
  Z80._ops.BIT3b,	Z80._ops.BIT3c,		Z80._ops.BIT3d,		Z80._ops.BIT3e,
  Z80._ops.BIT3h,	Z80._ops.BIT3l,		Z80._ops.BIT3m,		Z80._ops.BIT3a,
  // CB60
  Z80._ops.BIT4b,	Z80._ops.BIT4c,		Z80._ops.BIT4d,		Z80._ops.BIT4e,
  Z80._ops.BIT4h,	Z80._ops.BIT4l,		Z80._ops.BIT4m,		Z80._ops.BIT4a,
  Z80._ops.BIT5b,	Z80._ops.BIT5c,		Z80._ops.BIT5d,		Z80._ops.BIT5e,
  Z80._ops.BIT5h,	Z80._ops.BIT5l,		Z80._ops.BIT5m,		Z80._ops.BIT5a,
  // CB70
  Z80._ops.BIT6b,	Z80._ops.BIT6c,		Z80._ops.BIT6d,		Z80._ops.BIT6e,
  Z80._ops.BIT6h,	Z80._ops.BIT6l,		Z80._ops.BIT6m,		Z80._ops.BIT6a,
  Z80._ops.BIT7b,	Z80._ops.BIT7c,		Z80._ops.BIT7d,		Z80._ops.BIT7e,
  Z80._ops.BIT7h,	Z80._ops.BIT7l,		Z80._ops.BIT7m,		Z80._ops.BIT7a,
  // CB80
  Z80._ops.RES0b,	Z80._ops.RES0c,		Z80._ops.RES0d,		Z80._ops.RES0e,
  Z80._ops.RES0h,	Z80._ops.RES0l,		Z80._ops.RES0m,		Z80._ops.RES0a,
  Z80._ops.RES1b,	Z80._ops.RES1c,		Z80._ops.RES1d,		Z80._ops.RES1e,
  Z80._ops.RES1h,	Z80._ops.RES1l,		Z80._ops.RES1m,		Z80._ops.RES1a,
  // CB90
  Z80._ops.RES2b,	Z80._ops.RES2c,		Z80._ops.RES2d,		Z80._ops.RES2e,
  Z80._ops.RES2h,	Z80._ops.RES2l,		Z80._ops.RES2m,		Z80._ops.RES2a,
  Z80._ops.RES3b,	Z80._ops.RES3c,		Z80._ops.RES3d,		Z80._ops.RES3e,
  Z80._ops.RES3h,	Z80._ops.RES3l,		Z80._ops.RES3m,		Z80._ops.RES3a,
  // CBA0
  Z80._ops.RES4b,	Z80._ops.RES4c,		Z80._ops.RES4d,		Z80._ops.RES4e,
  Z80._ops.RES4h,	Z80._ops.RES4l,		Z80._ops.RES4m,		Z80._ops.RES4a,
  Z80._ops.RES5b,	Z80._ops.RES5c,		Z80._ops.RES5d,		Z80._ops.RES5e,
  Z80._ops.RES5h,	Z80._ops.RES5l,		Z80._ops.RES5m,		Z80._ops.RES5a,
  // CBB0
  Z80._ops.RES6b,	Z80._ops.RES6c,		Z80._ops.RES6d,		Z80._ops.RES6e,
  Z80._ops.RES6h,	Z80._ops.RES6l,		Z80._ops.RES6m,		Z80._ops.RES6a,
  Z80._ops.RES7b,	Z80._ops.RES7c,		Z80._ops.RES7d,		Z80._ops.RES7e,
  Z80._ops.RES7h,	Z80._ops.RES7l,		Z80._ops.RES7m,		Z80._ops.RES7a,
  // CBC0
  Z80._ops.SET0b,	Z80._ops.SET0c,		Z80._ops.SET0d,		Z80._ops.SET0e,
  Z80._ops.SET0h,	Z80._ops.SET0l,		Z80._ops.SET0m,		Z80._ops.SET0a,
  Z80._ops.SET1b,	Z80._ops.SET1c,		Z80._ops.SET1d,		Z80._ops.SET1e,
  Z80._ops.SET1h,	Z80._ops.SET1l,		Z80._ops.SET1m,		Z80._ops.SET1a,
  // CBD0
  Z80._ops.SET2b,	Z80._ops.SET2c,		Z80._ops.SET2d,		Z80._ops.SET2e,
  Z80._ops.SET2h,	Z80._ops.SET2l,		Z80._ops.SET2m,		Z80._ops.SET2a,
  Z80._ops.SET3b,	Z80._ops.SET3c,		Z80._ops.SET3d,		Z80._ops.SET3e,
  Z80._ops.SET3h,	Z80._ops.SET3l,		Z80._ops.SET3m,		Z80._ops.SET3a,
  // CBE0
  Z80._ops.SET4b,	Z80._ops.SET4c,		Z80._ops.SET4d,		Z80._ops.SET4e,
  Z80._ops.SET4h,	Z80._ops.SET4l,		Z80._ops.SET4m,		Z80._ops.SET4a,
  Z80._ops.SET5b,	Z80._ops.SET5c,		Z80._ops.SET5d,		Z80._ops.SET5e,
  Z80._ops.SET5h,	Z80._ops.SET5l,		Z80._ops.SET5m,		Z80._ops.SET5a,
  // CBF0
  Z80._ops.SET6b,	Z80._ops.SET6c,		Z80._ops.SET6d,		Z80._ops.SET6e,
  Z80._ops.SET6h,	Z80._ops.SET6l,		Z80._ops.SET6m,		Z80._ops.SET6a,
  Z80._ops.SET7b,	Z80._ops.SET7c,		Z80._ops.SET7d,		Z80._ops.SET7e,
  Z80._ops.SET7h,	Z80._ops.SET7l,		Z80._ops.SET7m,		Z80._ops.SET7a,
];

debugMessage('emulator!')
jsGB.reset();
jsGB.runTest()
console.log(JSON.stringify(resultDebug))