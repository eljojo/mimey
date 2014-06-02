module Mimey
  # his class represents the Game Boy MMU
  class MMU
    attr_accessor :gpu

    # Initializes the memory areas
    def initialize()
      @internal_memory = Array.new(8192, 0x00)
      @zram = Array.new(128, 0x00)
      @external_memory = Array.new(32768, 0x00)

      @word_accessor = WordAccessor.new(self)
      @rom_offset = 0x4000
      @ram_offset = 0

      @ie = 0
    end

    # Reads a byte from to the different memory areas
    def [](i)
      case i
      # ROM BANK 0
      when 0x0000..0x0FFF
        @rom[i]
      when 0x1000..0x3FFF
        @rom[i]
      # ROM BANK 1
      when 0x4000..0x7FFF
        @rom[@rom_offset + (i & 0x3FFF)]
      # VRAM
      when 0x8000..0x9FFF
        @gpu.vram[i & 0x1FFF]
      # External RAM
      when 0xA000..0xBFFF
        @external_memory[@ram_offset + (i & 0x1FFF)]
      # Work RAM and echo
      when 0xC000..0xFDFF
        @internal_memory[i & 0x1FFF]
      when 0xFE00..0xFEFF
        # return ((addr&0xFF)<0xA0) ? GPU._oam[addr&0xFF] : 0;
        puts "OAM"
        exit
      when 0xFFFF
        @ie
      # Zero page
      when 0xFF80..0xFFFF
        @zram[i & 0x7F]
      # GPU (64 registers)
      when 0xFF40..0xFF7F
        @gpu[i]
      else
        puts "trying to read unreachable memory: #{i} (0x#{i.to_s(16)})"
        exit
      end
    end

    # Gets the word accessor
    def word
      @word_accessor
    end

    # Writes a byte to the different memory areas
    def []=(i, n)
      case i
      # VRAM
      when 0x8000..0x9FFF
        @gpu.vram[i & 0x1FFF] = n
        @gpu.update_tile(i & 0x1FFF, n)
      # External RAM
      when 0xA000..0xBFFF
        @external_memory[@ram_offset + (i & 0x1FFF)] = n
      # Work RAM and echo
      when 0xC000..0xFDFF
        @internal_memory[i & 0x1FFF] = n
      when 0xFE00..0xFEFF
        # if ((addr & 0xFF) < 0xA0) GPU._oam[addr & 0xFF] = val;
        # GPU.updateoam(addr, val);
        puts "OAM"
        exit
      when 0xFFFF
        @ie
      when 0xFF00..0xFF3F
      # Zero page
      when 0xFF80..0xFFFF
        @zram[i & 0x7F] = n
      # GPU (64 registers)
      when 0xFF40..0xFF7F
        @gpu[i] = n
      else
        puts "trying to update unreachable memory: #{i} (0x#{i.to_s(16)}) => #{n}"
        exit
      end
    end

    # Loads a ROM
    def load_rom(*args)
      @rom = args
    end

    # Access to words (16 bits) in memory
    class WordAccessor
      # Creates a new word accessor for the specified MMU
      def initialize(mmu)
        @mmu = mmu
      end

      # Reads a word
      def [](i)
        @mmu[i] + (@mmu[i + 1] << 8)
      end

      # Writes a word
      def []=(i, n)
        @mmu[i] = n & 0xFF
        @mmu[i + 1] = n >> 8
      end
    end
  end
end
