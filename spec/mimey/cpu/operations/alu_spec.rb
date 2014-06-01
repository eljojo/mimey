require 'spec_helper'

describe Mimey::CPU do
  describe "INC RR operations" do
    it "must be 4" do
      cpu = CPU.new

      opcodes = [0x03, 0x13, 0x23, 0x33]

      [:inc_bc, :inc_de, :inc_hl, :inc_sp].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "should increment a register" do
      cpu = CPU.new

      cpu.load_with(0x03).step

      [:a, :f, :d, :e, :h, :l, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.bc.should == 0x0001
      cpu.pc.should == 0x0001
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should let in 0x0000 a register with 0xFFFF" do
      cpu = CPU.new(b:0xFF, c:0xFF)

      cpu.load_with(0x03).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end
  end

  describe "INC R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0x04, 0x0C, 0x14, 0x1C, 0x24, 0x2C, 0x3C]

      [:inc_b, :inc_c, :inc_d, :inc_e, :inc_h, :inc_l, :inc_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must increment register R by 1" do
      cpu = CPU.new

      cpu.load_with(0x04).step

      cpu.should have_only_registers(b:0x01, pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should set H flag if current value is 0x0F" do
      cpu = CPU.new(b:0x0F)

      cpu.load_with(0x04).step

      cpu.should have_only_registers(b:0x10, pc:0x0001)
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 1
    end

    it "should let the register in 0x00 and set Z and H flags if current value is 0xFF" do
      cpu = CPU.new(b:0xFF)

      cpu.load_with(0x04).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags(:z, :h)
      cpu.clock_m.should == 1
    end

    it "must not affect the C flag" do
      cpu = CPU.new(f: 0b0001_0000)

      cpu.load_with(0x04).step

      cpu.should have_only_registers(b:0x01, pc:0x0001)
      cpu.should have_only_flags(:c)
      cpu.clock_m.should == 1
    end
  end

  describe "DEC R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0x05, 0x0D, 0x15, 0x1D, 0x25, 0x2D, 0x3D]

      [:dec_b, :dec_c, :dec_d, :dec_e, :dec_h, :dec_l, :dec_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "should let the register in 0x00 and set Z and N flags if current value is 0x01" do
      cpu = CPU.new(b:0x01)

      cpu.load_with(0x05).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags(:z, :n)

      cpu.clock_m.should == 1
    end

    it "should set N and H flags if current value is 0x10" do
      cpu = CPU.new(b:0x10)

      cpu.load_with(0x05).step

      cpu.should have_only_registers(b:0x0F, pc:0x0001)
      cpu.should have_only_flags(:n, :h)
      cpu.clock_m.should == 1
    end

    it "should set N flags if current value is 0xFF" do
      cpu = CPU.new(b:0xFF)

      cpu.load_with(0x05).step

      cpu.should have_only_registers(b:0xFE, pc:0x0001)
      cpu.should have_only_flags(:n)
      cpu.clock_m.should == 1
    end

    it "should let the register in 0xFF and set Z and H flags if current value is 0x00" do
      cpu = CPU.new()

      cpu.load_with(0x05).step

      cpu.should have_only_registers(b:0xFF, pc:0x0001)
      cpu.should have_only_flags(:n, :h)
      cpu.clock_m.should == 1
    end

    it "must not affect the C flag" do
      cpu = CPU.new(b:0x01, f:0b0001_0000)

      cpu.load_with(0x05).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags(:z, :n, :c)
      cpu.clock_m.should == 1
    end
  end

  describe "ADD HL,RR operations" do
    it "must be 4" do
      cpu = CPU.new

      opcodes = [0x09, 0x19, 0x29, 0x39]

      [:add_hl_bc, :add_hl_de, :add_hl_hl, :add_hl_sp].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must add to HL register the value of the RR register" do
      cpu = CPU.new(b:0xAC, c:0xDB, h:0x00, l:01)

      cpu.load_with(0x09).step

      [:a, :d, :e, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.hl.should == 0xACDC
      cpu.pc.should == 0x0001
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set H flag if current value is of the form 0xnFFF and the value to is not of the form 0xn000" do
      cpu = CPU.new(b:0x00, c:0x01, h:0x0F, l:0xFF)

      cpu.load_with(0x09).step

      [:a, :d, :e, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.hl.should == 0x1000
      cpu.pc.should == 0x0001
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 2
    end

    it "should not set H flag if current value is of the form 0xnFFF and the value to add is of the form 0xn000" do
      cpu = CPU.new(b:0x10, c:0x00, h:0x0F, l:0xFF)

      cpu.load_with(0x09).step

      [:a, :f, :d, :e, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.hl.should == 0x1FFF
      cpu.pc.should == 0x0001
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set H and C flags if sum overflows" do
      cpu = CPU.new(b:0x00, c:0x01, h:0xFF, l:0xFF)

      cpu.load_with(0x09).step

      [:a, :d, :e, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.hl.should == 0x0000
      cpu.pc.should == 0x0001
      cpu.should have_only_flags(:h, :c)
      cpu.clock_m.should == 2
    end

    it "must not affect the Z flag" do
      cpu = CPU.new(b:0xAB, c:0xCD, f:0b1000_0000)

      cpu.load_with(0x09).step

      [:a, :d, :e, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.hl.should == 0xABCD
      cpu.pc.should == 0x0001
      cpu.should have_only_flags(:z)
      cpu.clock_m.should == 2
    end
  end

  describe "DEC RR operations" do
    it "must be 4" do
      cpu = CPU.new

      opcodes = [0x0B, 0x1B, 0x2B, 0x3B]

      [:dec_bc, :dec_de, :dec_hl, :dec_sp].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "should decrement a register" do
      cpu = CPU.new(b:0x00, c:0x01)

      cpu.load_with(0x0B).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should let in 0xFFFF a register with 0x0000" do
      cpu = CPU.new(b:0x00, c:0x00)

      cpu.load_with(0x0B).step

      [:a, :f, :d, :e, :h, :l, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.bc.should == 0xFFFF
      cpu.pc.should == 0x0001
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end
  end

  describe "CPL" do
    it "must set the A register into its complement" do
      cpu = CPU.new(a:0b1010_1010)

      cpu.load_with(0x2F).step

      cpu.should have_only_registers(a:0b0101_0101, pc:0x0001)
      cpu.should have_only_flags(:n, :h)
      cpu.clock_m.should == 1
    end

    it "should not affect the Z and C flags, and set N and H flags" do
      cpu = CPU.new(a:0b1010_1010, f:0b1001_0000)

      cpu.load_with(0x2F).step

      cpu.should have_only_registers(a:0b0101_0101, pc:0x0001)
      cpu.should have_only_flags(:z, :n, :h, :c)
      cpu.clock_m.should == 1
    end
  end

  describe "CCF" do
    it "must set the C flag if its not" do
      cpu = CPU.new(f:0b0000_0000)

      cpu.load_with(0x3F).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags(:c)
      cpu.clock_m.should == 1
    end

    it "must reset the C flag if its set" do
      cpu = CPU.new(f:0b0001_0000)

      cpu.load_with(0x3F).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should not affect the Z flag, and reset N and H flags" do
      cpu = CPU.new(f:0b1110_0000)

      cpu.load_with(0x3F).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags(:z, :c)
      cpu.clock_m.should == 1
    end
  end

  describe "SCF" do
    it "must set the C flag" do
      cpu = CPU.new(f:0b0000_0000)

      cpu.load_with(0x37).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags(:c)
      cpu.clock_m.should == 1
    end

    it "should not affect the Z flag, and reset N and H flags" do
      cpu = CPU.new(f:0b1111_0000)

      cpu.load_with(0x37).step

      cpu.should have_only_registers(pc:0x0001)
      cpu.should have_only_flags(:z, :c)
      cpu.clock_m.should == 1
    end
  end

  describe "ADD A,R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x87]

      [:add_a_b, :add_a_c, :add_a_d, :add_a_e, :add_a_h, :add_a_l, :add_a_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must add a register to the A register" do
      cpu = CPU.new(b:0xAC)

      cpu.load_with(0x80).step

      cpu.should have_only_registers(a:0xAC, b:0xAC, pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should set H flag if current value is of the form 0xnF and the value to add is not of the form 0xn0" do
      cpu = CPU.new(a:0x1F, b:0x01)

      cpu.load_with(0x80).step

      cpu.should have_only_registers(a:0x20, b:0x01, pc:0x0001)
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 1
    end

    it "should not set H flag if current value is of the form 0xnF and the value to add is of the form 0xn0" do
      cpu = CPU.new(a:0x1F, b:0x10)

      cpu.load_with(0x80).step

      cpu.should have_only_registers(a:0x2F, b:0x10, pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should set H and C flags if sum overflows" do
      cpu = CPU.new(a:0xFF, b:0x02)

      cpu.load_with(0x80).step

      cpu.should have_only_registers(a:0x01, b:0x02, pc:0x0001)
      cpu.should have_only_flags(:h, :c)
      cpu.clock_m.should == 1
    end

    it "must set the Z flag if the result is 0" do
      cpu = CPU.new(a:0xFF, b:0x01)

      cpu.load_with(0x80).step

      cpu.should have_only_registers(a:0x00, b:0x01, pc:0x0001)
      cpu.should have_only_flags(:z, :h, :c)
      cpu.clock_m.should == 1
    end
  end

  describe "ADD A,(HL)" do
    it "must add the memory pointed by the HL register to the A register" do
      cpu = CPU.new(h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0xAC
      cpu.load_with(0x86).step

      cpu.should have_only_registers(a:0xAC, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags()
      cpu.mmu[0xCAFE].should == 0xAC
      cpu.clock_m.should == 2
    end

    it "should set H flag if current value is of the form 0xnF and the value to add is not of the form 0xn0" do
      cpu = CPU.new(a:0x1F, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0x01
      cpu.load_with(0x86).step

      cpu.should have_only_registers(a:0x20, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:h)
      cpu.mmu[0xCAFE].should == 0x01
      cpu.clock_m.should == 2
    end

    it "should not set H flag if current value is of the form 0xnF and the value to add is of the form 0xn0" do
      cpu = CPU.new(a:0x1F, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0x10
      cpu.load_with(0x86).step

      cpu.should have_only_registers(a:0x2F, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags()
      cpu.mmu[0xCAFE].should == 0x10
      cpu.clock_m.should == 2
    end

    it "should set H and C flags if sum overflows" do
      cpu = CPU.new(a:0xFF, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0x02
      cpu.load_with(0x86).step

      cpu.should have_only_registers(a:0x01, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:h, :c)
      cpu.mmu[0xCAFE].should == 0x02
      cpu.clock_m.should == 2
    end

    it "must set the Z flag if the result is 0" do
      cpu = CPU.new(a:0xFF, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0x01
      cpu.load_with(0x86).step

      cpu.should have_only_registers(a:0x00, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:z, :h, :c)
      cpu.mmu[0xCAFE].should == 0x01
      cpu.clock_m.should == 2
    end
  end

  describe "ADD A,n" do
    it "must add a 8 bit number to the A register" do
      cpu = CPU.new()

      cpu.load_with(0xC6, 0xAC).step

      cpu.should have_only_registers(a:0xAC, pc:0x0002)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set H flag if current value is of the form 0xnF and the value to add is not of the form 0xn0" do
      cpu = CPU.new(a:0x1F)

      cpu.load_with(0xC6, 0x01).step

      cpu.should have_only_registers(a:0x20, pc:0x0002)
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 2
    end

    it "should not set H flag if current value is of the form 0xnF and the value to add is of the form 0xn0" do
      cpu = CPU.new(a:0x1F)

      cpu.load_with(0xC6, 0x10).step

      cpu.should have_only_registers(a:0x2F, pc:0x0002)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set H and C flags if sum overflows" do
      cpu = CPU.new(a:0xFF)

      cpu.load_with(0xC6, 0x02).step

      cpu.should have_only_registers(a:0x01, pc:0x0002)
      cpu.should have_only_flags(:h, :c)
      cpu.clock_m.should == 2
    end

    it "must set the Z flag if the result is 0" do
      cpu = CPU.new(a:0xFF)

      cpu.load_with(0xC6, 0x01).step

      cpu.should have_only_registers(a:0x00, pc:0x0002)
      cpu.should have_only_flags(:z, :h, :c)
      cpu.clock_m.should == 2
    end
  end

  describe "ADC A,R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8F]

      [:adc_a_b, :adc_a_c, :adc_a_d, :adc_a_e, :adc_a_h, :adc_a_l, :adc_a_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must add a register and the carry flag to the A register" do
      cpu = CPU.new(b:0xAB, f:CPU::C_FLAG)

      cpu.load_with(0x88).step

      cpu.should have_only_registers(a:0xAC, b:0xAB, pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should set H flag if current value is of the form 0xnF and the value to add is not of the form 0xn0" do
      cpu = CPU.new(a:0x1F, f:CPU::C_FLAG)

      cpu.load_with(0x88).step

      cpu.should have_only_registers(a:0x20, b:0x00, pc:0x0001)
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 1
    end

    it "should not set H flag if current value is of the form 0xnF and the value to add is of the form 0xn0" do
      cpu = CPU.new(a:0x1F, b:0x0F, f:CPU::C_FLAG)

      cpu.load_with(0x88).step

      cpu.should have_only_registers(a:0x2F, b:0x0F, pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should set H and C flags if sum overflows" do
      cpu = CPU.new(a:0xFF, b:0x01, f:CPU::C_FLAG)

      cpu.load_with(0x88).step

      cpu.should have_only_registers(a:0x01, b:0x01, pc:0x0001)
      cpu.should have_only_flags(:h, :c)
      cpu.clock_m.should == 1
    end

    it "must set the Z flag if the result is 0" do
      cpu = CPU.new(a:0xFF, f:CPU::C_FLAG)

      cpu.load_with(0x88).step

      cpu.should have_only_registers(a:0x00, b:0x00, pc:0x0001)
      cpu.should have_only_flags(:z, :h, :c)
      cpu.clock_m.should == 1
    end
  end

  describe "ADC A,(HL)" do
    it "must add the memory pointed by the HL register and the C (carry) flag to the A register" do
      cpu = CPU.new(h:0xCA, l:0xFE, f:CPU::C_FLAG)

      cpu.mmu[0xCAFE] = 0xAB
      cpu.load_with(0x8E).step

      cpu.should have_only_registers(a:0xAC, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags()
      cpu.mmu[0xCAFE].should == 0xAB
      cpu.clock_m.should == 2
    end

    it "should set H flag if current value is of the form 0xnF and the value to add is not of the form 0xn0" do
      cpu = CPU.new(a:0x1F, h:0xCA, l:0xFE, f:CPU::C_FLAG)

      cpu.mmu[0xCAFE] = 0x00
      cpu.load_with(0x8E).step

      cpu.should have_only_registers(a:0x20, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:h)
      cpu.mmu[0xCAFE].should == 0x00
      cpu.clock_m.should == 2
    end

    it "should not set H flag if current value is of the form 0xnF and the value to add is of the form 0xn0" do
      cpu = CPU.new(a:0x1F, h:0xCA, l:0xFE, f:CPU::C_FLAG)

      cpu.mmu[0xCAFE] = 0x0F
      cpu.load_with(0x8E).step

      cpu.should have_only_registers(a:0x2F, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags()
      cpu.mmu[0xCAFE].should == 0x0F
      cpu.clock_m.should == 2
    end

    it "should set H and C flags if sum overflows" do
      cpu = CPU.new(a:0xFF, h:0xCA, l:0xFE, f:CPU::C_FLAG)

      cpu.mmu[0xCAFE] = 0x01
      cpu.load_with(0x8E).step

      cpu.should have_only_registers(a:0x01, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:h, :c)
      cpu.mmu[0xCAFE].should == 0x01
      cpu.clock_m.should == 2
    end

    it "must set the Z flag if the result is 0" do
      cpu = CPU.new(a:0xFF, h:0xCA, l:0xFE, f:CPU::C_FLAG)

      cpu.mmu[0xCAFE] = 0x00
      cpu.load_with(0x8E).step

      cpu.should have_only_registers(a:0x00, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:z, :h, :c)
      cpu.clock_m.should == 2
    end
  end

  describe "ADC A,n" do
    it "must add a 8 bit value and the C (carry) flag to the A register" do
      cpu = CPU.new(f:CPU::C_FLAG)

      cpu.load_with(0xCE, 0xAB).step

      cpu.should have_only_registers(a:0xAC, pc:0x0002)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set H flag if current value is of the form 0xnF and the value to add is not of the form 0xn0" do
      cpu = CPU.new(a:0x1F, f:CPU::C_FLAG)

      cpu.load_with(0xCE, 0x00).step

      cpu.should have_only_registers(a:0x20, pc:0x0002)
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 2
    end

    it "should not set H flag if current value is of the form 0xnF and the value to add is of the form 0xn0" do
      cpu = CPU.new(a:0x1F, f:CPU::C_FLAG)

      cpu.load_with(0xCE, 0x0F).step

      cpu.should have_only_registers(a:0x2F, pc:0x0002)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set H and C flags if sum overflows" do
      cpu = CPU.new(a:0xFF, f:CPU::C_FLAG)

      cpu.load_with(0xCE, 0x01).step

      cpu.should have_only_registers(a:0x01, pc:0x0002)
      cpu.should have_only_flags(:h, :c)
      cpu.clock_m.should == 2
    end

    it "must set the Z flag if the result is 0" do
      cpu = CPU.new(a:0xFF, f:CPU::C_FLAG)

      cpu.load_with(0xCE, 0x00).step

      cpu.should have_only_registers(a:0x00, pc:0x0002)
      cpu.should have_only_flags(:z, :h, :c)
      cpu.clock_m.should == 2
    end
  end

  describe "AND R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA7]

      [:and_b, :and_c, :and_d, :and_e, :and_h, :and_l, :and_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "should do a logical and between A and a 8 bits register and set the result in A" do
      cpu = CPU.new(a:0b1111_0000, b:0b1010_1010)

      cpu.load_with(0xA0).step

      cpu.should have_only_registers(a:0b1010_0000, b:0b1010_1010, pc:0x0001)
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 1
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0101_0101, b:0b1010_1010)

      cpu.load_with(0xA0).step

      cpu.should have_only_registers(a:0b0000_0000, b:0b1010_1010, pc:0x0001)
      cpu.should have_only_flags(:z, :h)
      cpu.clock_m.should == 1
    end
  end

  describe "AND (HL)" do
    it "should do a logical and between A and the memory pointed by the HL register and set the result in A" do
      cpu = CPU.new(a:0b1111_0000, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0b1010_1010
      cpu.load_with(0xA6).step

      cpu.should have_only_registers(a:0b1010_0000, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:h)
      cpu.mmu[0xCAFE].should == 0b1010_1010
      cpu.clock_m.should == 2
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0101_0101, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0b1010_1010
      cpu.load_with(0xA6).step

      cpu.should have_only_registers(a:0b0000_0000, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:z, :h)
      cpu.mmu[0xCAFE].should == 0b1010_1010
      cpu.clock_m.should == 2
    end
  end

  describe "AND N" do
    it "should do a logical and between A and a 8 bit value and set the result in A" do
      cpu = CPU.new(a:0b1111_0000)

      cpu.load_with(0xE6, 0b1010_1010).step

      cpu.should have_only_registers(a:0b1010_0000, pc:0x0002)
      cpu.should have_only_flags(:h)
      cpu.clock_m.should == 2
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0101_0101)

      cpu.load_with(0xE6, 0b1010_1010).step

      cpu.should have_only_registers(a:0b0000_0000, pc:0x0002)
      cpu.should have_only_flags(:z, :h)
      cpu.clock_m.should == 2
    end
  end

  describe "XOR R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAF]

      [:xor_b, :xor_c, :xor_d, :xor_e, :xor_h, :xor_l, :xor_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "should do a XOR between A and a 8 bits register and set the result in A" do
      cpu = CPU.new(a:0b1111_0000, b:0b1010_1010)

      cpu.load_with(0xA8).step

      cpu.should have_only_registers(a:0b0101_1010, b:0b1010_1010, pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0101_0101, b:0b0101_0101)

      cpu.load_with(0xA8).step

      cpu.should have_only_registers(a:0b0000_0000, b:0b0101_0101, pc:0x0001)
      cpu.should have_only_flags(:z)
      cpu.clock_m.should == 1
    end
  end

  describe "XOR (HL)" do
    it "should do a XOR between A and the memory pointed by the HL register and set the result in A" do
      cpu = CPU.new(a:0b1111_0000, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0b1010_1010
      cpu.load_with(0xAE).step

      cpu.should have_only_registers(a:0b0101_1010, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags()
      cpu.mmu[0xCAFE].should == 0b1010_1010
      cpu.clock_m.should == 2
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0101_0101, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0b0101_0101
      cpu.load_with(0xAE).step

      cpu.should have_only_registers(a:0b0000_0000, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:z)
      cpu.mmu[0xCAFE].should == 0b0101_0101
      cpu.clock_m.should == 2
    end
  end

  describe "XOR N" do
    it "should do a logical XOR between A and a 8 bit value and set the result in A" do
      cpu = CPU.new(a:0b1111_0000)

      cpu.load_with(0xEE, 0b1010_1010).step

      cpu.should have_only_registers(a:0b0101_1010, pc:0x0002)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0101_0101)

      cpu.load_with(0xEE, 0b0101_0101).step

      cpu.should have_only_registers(a:0b0000_0000, pc:0x0002)
      cpu.should have_only_flags(:z)
      cpu.clock_m.should == 2
    end
  end

  describe "OR R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB7]

      [:or_b, :or_c, :or_d, :or_e, :or_h, :or_l, :or_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "should do a logical OR between A and a 8 bits register and set the result in A" do
      cpu = CPU.new(a:0b1111_0000, b:0b1010_1010)

      cpu.load_with(0xB0).step

      cpu.should have_only_registers(a:0b1111_1010, b:0b1010_1010, pc:0x0001)
      cpu.should have_only_flags()
      cpu.clock_m.should == 1
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0000_0000, b:0b0000_0000)

      cpu.load_with(0xB0).step

      cpu.should have_only_registers(a:0b0000_0000, b:0b0000_0000, pc:0x0001)
      cpu.should have_only_flags(:z)
      cpu.clock_m.should == 1
    end
  end

  describe "OR (HL)" do
    it "should do a logical OR between A and the memory pointed by the HL register and set the result in A" do
      cpu = CPU.new(a:0b1111_0000, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0b1010_1010
      cpu.load_with(0xB6).step

      cpu.should have_only_registers(a:0b1111_1010, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags()
      cpu.mmu[0xCAFE].should == 0b1010_1010
      cpu.clock_m.should == 2
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0000_0000, h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0b0000_0000
      cpu.load_with(0xB6).step

      cpu.should have_only_registers(a:0b0000_0000, h:0xCA, l:0xFE, pc:0x0001)
      cpu.should have_only_flags(:z)
      cpu.mmu[0xCAFE].should == 0b0000_0000
      cpu.clock_m.should == 2
    end
  end

  describe "OR N" do
    it "should do a logical or between A and a 8 bit value and set the result in A" do
      cpu = CPU.new(a:0b1111_0000)

      cpu.load_with(0xF6, 0b1010_1010).step

      cpu.should have_only_registers(a:0b1111_1010, pc:0x0002)
      cpu.should have_only_flags()
      cpu.clock_m.should == 2
    end

    it "should set the Z flag it the result is 0x00" do
      cpu = CPU.new(a:0b0000_0000)

      cpu.load_with(0xF6, 0b0000_0000).step

      cpu.should have_only_registers(a:0b0000_0000, pc:0x0002)
      cpu.should have_only_flags(:z)
      cpu.clock_m.should == 2
    end
  end

  describe "SUB A,R operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x97]

      [:sub_a_b, :sub_a_c, :sub_a_d, :sub_a_e, :sub_a_h, :sub_a_l, :sub_a_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must substract a register to the A register" do
      cpu = CPU.new(a:0xAC, b:0xAC)

      cpu.load_with(0x90).step

      cpu.should have_only_registers(b:0xAC, pc:0x0001)
      cpu.should have_only_flags(:z, :n)
      cpu.clock_m.should == 1
    end

    it "should set H flag if current value is of the form 0xn0 and the value to sub of the form 0xnF" do
      cpu = CPU.new(a:0x10, b:0x1F)

      cpu.load_with(0x90).step

      cpu.should have_only_registers(a:0xF1, b:0x1F, pc:0x0001)
      cpu.should have_only_flags(:n, :h, :c)
      cpu.clock_m.should == 1
    end

    it "should not set H flag if current value is of the form 0xnF and the value to sub is of the form 0xn0" do
      cpu = CPU.new(a:0x1F, b:0x10)

      cpu.load_with(0x90).step

      cpu.should have_only_registers(a:0x0F, b:0x10, pc:0x0001)
      cpu.should have_only_flags(:n)
      cpu.clock_m.should == 1
    end

    it "should set H and C flags if sub overflows" do
      cpu = CPU.new(a:0x02, b:0xFF)

      cpu.load_with(0x90).step

      cpu.should have_only_registers(a:0x03, b:0xFF, pc:0x0001)
      cpu.should have_only_flags(:n, :h, :c)
      cpu.clock_m.should == 1
    end

    it "must set the Z flag if the result is 0" do
      cpu = CPU.new(a:0xCA, b:0xCA)

      cpu.load_with(0x90).step

      cpu.should have_only_registers(b:0xCA, pc:0x0001)
      cpu.should have_only_flags(:z, :n)
      cpu.clock_m.should == 1
    end
  end
end
