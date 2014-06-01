require 'spec_helper'

describe Mimey::CPU do
  describe "LD RR,nn operations" do
    it "must be 4" do
      cpu = CPU.new

      opcodes = [0x01, 0x11, 0x21, 0x31]

      [:ld_bc_nn, :ld_de_nn, :ld_hl_nn, :ld_sp_nn].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must load a 16 bit value into a 16 bit register" do
      cpu = CPU.new

      cpu.load_with(0x01, 0xAB, 0xCD).step

      [:a, :f, :d, :e, :h, :l, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.bc.should == 0xABCD
      cpu.pc.should == 0x0003
      cpu.clock.should == 3
    end
  end

  describe "LD (RR),A operations" do
    it "must be 3" do
      cpu = CPU.new

      opcodes = [0x02, 0x12, 0x77]

      [:ld_mbc_a, :ld_mde_a, :ld_mhl_a].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must load the A register into the memory at address pointed by register RR" do
      cpu = CPU.new(a:0xAB, b: 0xCA, c:0xFE)

      cpu.load_with(0x02).step

      [:f, :d, :e, :h, :l, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.mmu[0xCAFE].should == 0xAB
      cpu.pc.should == 0x0001
      cpu.clock.should == 2
    end
  end

  describe "LD R,n operations" do
    it "must be 7" do
      cpu = CPU.new

      opcodes = [0x06, 0x0E, 0x16, 0x1E, 0x26, 0x2E, 0x3E]

      [:ld_b_n, :ld_c_n, :ld_d_n, :ld_e_n, :ld_h_n, :ld_l_n, :ld_a_n].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must load a 8 bit value into a 8 bit register" do
      cpu = CPU.new

      cpu.load_with(0x06, 0xAB).step

      [:a, :f, :d, :e, :h, :l, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.b.should == 0xAB
      cpu.pc.should == 0x0002
      cpu.clock.should == 2
    end
  end

  it "must have a LD (nn),SP operation with opcode 0x08 that loads the SP register into the memory" do
    cpu = CPU.new(sp:0xABCD)

    cpu.load_with(0x08, 0xCA, 0xFE).step

    [:a, :b, :f, :b, :c, :d, :e, :h, :l].each do |r|
      cpu.instance_variable_get("@#{r}").should == 0x00
    end

    cpu.mmu.word[0xCAFE].should == 0xABCD
    cpu.pc.should == 0x0003
    cpu.clock.should == 5
  end


  describe "LD A,(RR) operations" do
    it "must be 3" do
      cpu = CPU.new

      opcodes = [0x0A, 0x1A, 0x7E]

      [:ld_a_mbc, :ld_a_mde, :ld_a_mhl].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must load the memory at address pointed by register RR into the A register" do
      cpu = CPU.new(b:0xCA, c:0xFE)

      cpu.mmu[0xCAFE] = 0xAB
      cpu.load_with(0x0A).step

      [:f, :d, :e, :h, :l, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.a.should == 0xAB
      cpu.pc.should == 0x0001
      cpu.clock.should == 2
    end
  end

  describe "LD R,R operations" do
    it "must be 49" do
      cpu = CPU.new

      opcodes = [
        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x47,
        0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4F,
        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x57,
        0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5F,
        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x67,
        0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6F,
        0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7F,
      ]

      operations = [
        :ld_b_b, :ld_b_c, :ld_b_d, :ld_b_e, :ld_b_h, :ld_b_l, :ld_b_a,
        :ld_c_b, :ld_c_c, :ld_c_d, :ld_c_e, :ld_c_h, :ld_c_l, :ld_c_a,
        :ld_d_b, :ld_d_c, :ld_d_d, :ld_d_e, :ld_d_h, :ld_d_l, :ld_d_a,
        :ld_e_b, :ld_e_c, :ld_e_d, :ld_e_e, :ld_e_h, :ld_e_l, :ld_e_a,
        :ld_h_b, :ld_h_c, :ld_h_d, :ld_h_e, :ld_h_h, :ld_h_l, :ld_h_a,
        :ld_l_b, :ld_l_c, :ld_l_d, :ld_l_e, :ld_l_h, :ld_l_l, :ld_l_a,
        :ld_a_b, :ld_a_c, :ld_a_d, :ld_a_e, :ld_a_h, :ld_a_l, :ld_a_a,
      ]

      operations.each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must load a 8 bit register into another 8 bit register" do
      cpu = CPU.new(c:0xAB)

      cpu.load_with(0x41).step

      [:a, :f, :d, :e, :h, :l, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.b.should == 0xAB
      cpu.c.should == 0xAB
      cpu.pc.should == 0x0001
      cpu.clock.should == 1
    end
  end

  describe "LD R,(HL) operations" do
    it "must be 6" do
      cpu = CPU.new

      opcodes = [0x46, 0x4E, 0x56, 0x5E, 0x66, 0x6E]

      [:ld_b_mhl, :ld_c_mhl, :ld_d_mhl, :ld_e_mhl, :ld_h_mhl, :ld_l_mhl].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must load the memory at address pointed by register HL into the register" do
      cpu = CPU.new(h:0xCA, l:0xFE)

      cpu.mmu[0xCAFE] = 0xAB
      cpu.load_with(0x46).step

      [:a, :c, :f, :d, :e, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.b.should == 0xAB
      cpu.hl.should == 0xCAFE
      cpu.pc.should == 0x0001
      cpu.clock.should == 2
    end
  end

  describe "LD (HL),R operations" do
    it "must be 6" do
      cpu = CPU.new

      opcodes = [0x70, 0x71, 0x72, 0x73, 0x74, 0x75]

      [:ld_mhl_b, :ld_mhl_c, :ld_mhl_d, :ld_mhl_e, :ld_mhl_h, :ld_mhl_l].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "must load he register into the memory at address pointed by register HL" do
      cpu = CPU.new(b:0xAB, h:0xCA, l:0xFE)

      cpu.load_with(0x70).step

      [:a, :c, :f, :d, :e, :sp].each do |r|
        cpu.instance_variable_get("@#{r}").should == 0x00
      end

      cpu.mmu[0xCAFE].should == 0xAB
      cpu.b.should == 0xAB
      cpu.hl.should == 0xCAFE
      cpu.pc.should == 0x0001
      cpu.clock.should == 2
    end
  end

  it "must have a LDI (HL),A operation with opcode 0x22 that loads the A register into the memory pointed by HL, and then increments HL" do
    cpu = CPU.new(a:0xAB, h:0xCA, l:0xFD)

    cpu.load_with(0x22).step

    [:b, :f, :b, :c, :d, :e, :sp].each do |r|
      cpu.instance_variable_get("@#{r}").should == 0x00
    end

    cpu.mmu[0xCAFD].should == 0xAB
    cpu.hl.should == 0xCAFE
    cpu.a.should == 0xAB
    cpu.pc.should == 0x0001
    cpu.clock.should == 2
  end

  it "must have a LDI A,(HL) operation with opcode 0x32 that loads the memory pointed by HL into the A register, and then increments HL" do
    cpu = CPU.new(h:0xCA, l:0xFD)

    cpu.mmu[0xCAFD] = 0xAB
    cpu.load_with(0x2A).step

    [:b, :f, :b, :c, :d, :e, :sp].each do |r|
      cpu.instance_variable_get("@#{r}").should == 0x00
    end

    cpu.mmu[0xCAFD].should == 0xAB
    cpu.hl.should == 0xCAFE
    cpu.a.should == 0xAB
    cpu.pc.should == 0x0001
    cpu.clock.should == 2
  end

  it "must have a LDD (HL),A operation with opcode 0x2A that loads the A register into the memory pointed by HL, and then decrements HL" do
    cpu = CPU.new(a:0xAB, h:0xCA, l:0xFF)

    cpu.load_with(0x32).step

    [:b, :f, :b, :c, :d, :e, :sp].each do |r|
      cpu.instance_variable_get("@#{r}").should == 0x00
    end

    cpu.mmu[0xCAFF].should == 0xAB
    cpu.hl.should == 0xCAFE
    cpu.a.should == 0xAB
    cpu.pc.should == 0x0001
    cpu.clock.should == 2
  end

  it "must have a LDD A,(HL) operation with opcode 0x3A that loads the memory pointed by HL into the A register, and then decrements HL" do
    cpu = CPU.new(h:0xCA, l:0xFF)

    cpu.mmu[0xCAFF] = 0xAB
    cpu.load_with(0x3A).step

    [:b, :f, :b, :c, :d, :e, :sp].each do |r|
      cpu.instance_variable_get("@#{r}").should == 0x00
    end

    cpu.mmu[0xCAFF].should == 0xAB
    cpu.hl.should == 0xCAFE
    cpu.a.should == 0xAB
    cpu.pc.should == 0x0001
    cpu.clock.should == 2
  end

  it "must have a LD (HL),n operation with opcode 0x36 that loads a 8 bit number into the memory pointed by HL" do
    cpu = CPU.new(h:0xCA, l:0xFE)

    cpu.load_with(0x36, 0xAB).step

    [:a, :f, :b, :c, :d, :e, :sp].each do |r|
      cpu.instance_variable_get("@#{r}").should == 0x00
    end

    cpu.mmu[0xCAFE].should == 0xAB
    cpu.hl.should == 0xCAFE
    cpu.pc.should == 0x0002
    cpu.clock.should == 3
  end

  pending "implements LD_mma correctly"
  pending "implements LD_amm correctly"
  pending "implements LD_HLmm correctly"
  pending "implements LD_mmHL correctly"
  pending "implements LDAIOn correctly"
  pending "implements LDIOnA correctly"
  pending "implements LDAIOC correctly"
  pending "implements LDIOCA correctly"
  pending "implements LDHLSPn correctly"
end
