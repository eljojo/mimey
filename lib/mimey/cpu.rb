require 'mimey/cpu/operations'

module Mimey
  # This class represents the Game Boy CPU, a modified Z80.
  class CPU
    # 8 bit registers: A, F, B, C, D, E, H, L
    attr_accessor :a, :f, :b, :c, :d, :e, :h, :l
    # 16 bit PC register (Program counter)
    attr_accessor :pc
    # 16 bit SP register (Stack pointer)
    attr_accessor :sp
    # MMU
    attr_accessor :mmu
    # nop-mode
    attr_accessor :nop_mode

    # CPU Clock
    attr_accessor :clock_m
    attr_accessor :clock_t

    # Clock for last instruction
    attr_accessor :r_m
    attr_accessor :r_t


    # Default register values
    DEFAULTS = {
      a: 0x00,
      f: 0x00,
      b: 0x00,
      c: 0x00,
      d: 0x00,
      e: 0x00,
      h: 0x00,
      l: 0x00,
      pc: 0x0000,
      sp: 0x0000
    }

    # Bitmasks for Z, N, H and C flags from the F register
    Z_FLAG = 0b1000_0000
    N_FLAG = 0b0100_0000
    H_FLAG = 0b0010_0000
    C_FLAG = 0b0001_0000

    # Creates a new CPU and initializes with the provided options
    # if no options where give all the registers will be initialized
    # with deafult values
    def initialize(options = {})
      DEFAULTS.merge(options).each do |k, v|
        instance_variable_set("@#{k}", v)
      end

      @clock_m = 0
      @clock_t = 0
      @r_m = 0
      @r_t = 0
      @mmu = MMU.new
    end

    # Executes next instruction
    def step
      operation = OPERATIONS[next_byte]
      if not self.respond_to?(operation) and !!nop_mode
        puts "warning! we don't know how to #{operation}"
        operation = "nop"
      end
      method(operation).call
    end

    # Loads a program
    def load_with(*args)
      @mmu.load_rom(*args)
      self
    end

    # prints debug information
    def debug
      puts "a: #{a}, f: #{f}, b: #{b}, c: #{c}, d: #{d}, e: #{e}, h: #{h}, l: #{l}\tpc: #{pc}, sp: #{sp}, clock: #{clock}"
    end

    # Reads the next byte from memory and increments PC by 1
    def next_byte
      @pc += 1
      @mmu[@pc - 1]
    end

    # Reads the next word from memory and increments PC by 2
    def next_word
      @pc += 2
      @mmu.word[@pc - 2]
    end

    # Gets the value of the "virtual" 16 bits AF register
    def af
      (@a << 8) + @f
    end

    # Sets the value of the "virtual" 16 bits AF register
    def af=(n)
      @a = (n >> 8)
      @f = n & 0xFF
    end

    # Gets the value of the "virtual" 16 bits BC register
    def bc
      (@b << 8) + @c
    end

    # Sets the value of the "virtual" 16 bits BC register
    def bc=(n)
      @b = (n >> 8)
      @c = n & 0xFF
    end

    # Gets the value of the "virtual" 16 bits DE register
    def de
      (@d << 8) + @e
    end

    # Sets the value of the "virtual" 16 bits DE register
    def de=(n)
      @d = (n >> 8)
      @e = n & 0xFF
    end

    # Gets the value of the "virtual" 16 bits HL register
    def hl
      (@h << 8) + @l
    end

    # Sets the value of the "virtual" 16 bits HL register
    def hl=(n)
      @h = (n >> 8)
      @l = n & 0xFF
    end

    # Gets the Z flag from the F register
    def z_flag
      (@f & Z_FLAG) == Z_FLAG
    end

    # Gets the N flag from the F register
    def n_flag
      (@f & N_FLAG) == N_FLAG
    end

    # Gets the H flag from the F register
    def h_flag
      (@f & H_FLAG) == H_FLAG
    end

    # Gets the C flag from the F register
    def c_flag
      (@f & C_FLAG) == C_FLAG
    end
  end
end
