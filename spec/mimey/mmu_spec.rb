require 'spec_helper'

describe Mimey::MMU do
  let(:mmu) { Mimey::MMU.new }

  it 'writes and reads bytes in the internal memory' do
    mmu[0xC000] = 0xAB
    mmu[0xDFFF] = 0xCD

    mmu[0xC000].should == 0xAB
    mmu[0xDFFF].should == 0xCD
  end

  it 'writes and reads bytes in the shadow memory' do
    mmu[0xE000] = 0xAB
    mmu[0xFDFF] = 0xCD

    mmu[0xE000].should == 0xAB
    mmu[0xFDFF].should == 0xCD
  end

  it 'writes a byte in the internal memory and reads it from the shadow memory' do
    mmu[0xC000] = 0xAB
    mmu[0xDDFF] = 0xCD

    mmu[0xE000].should == 0xAB
    mmu[0xFDFF].should == 0xCD
  end

  it 'writes a byte in the shadow memory and reads it from the internal memory' do
    mmu[0xE000] = 0xAB
    mmu[0xFDFF] = 0xCD

    mmu[0xC000].should == 0xAB
    mmu[0xDDFF].should == 0xCD
  end

  it 'loads a ROM and reads it' do
    mmu.load_rom(0xAB, 0xCD, 0xDE)

    mmu[0x00].should == 0xAB
    mmu[0x01].should == 0xCD
    mmu[0x02].should == 0xDE
    mmu[0x03].should be nil
  end

  it 'does not let a program to modify the ROM' do
    mmu.load_rom(0xAB)

    mmu[0x00] = 0xCD

    mmu[0x00].should == 0xAB
  end

  it 'reads words' do
    mmu[0xC000] = 0xAB
    mmu[0xC001] = 0xCD

    mmu.word[0xC000].should == 0xCDAB
  end

  it 'writes words' do
    mmu.word[0xC000] = 0xABCD

    mmu[0xC000].should == 0xCD
    mmu[0xC001].should == 0xAB
  end
end
