import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Product, CreateProductInput, UpdateProductInput } from '../../../shared/types';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProductInput | UpdateProductInput) => Promise<void>;
  product?: Product | null;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  product,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price.toString());
    } else {
      setName('');
      setPrice('');
    }
    setError(null);
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Məhsul adı daxil edin.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Düzgün qiymət daxil edin.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await onSubmit({ id: product!.id, name: name.trim(), price: priceNum } as UpdateProductInput);
      } else {
        await onSubmit({ name: name.trim(), price: priceNum } as CreateProductInput);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Məhsulu redaktə et' : 'Yeni məhsul'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Məhsul adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Məhsulun adı"
          required
        />

        <Input
          label="Qiymət (AZN)"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          required
        />

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            Ləğv et
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Yadda saxla' : 'Əlavə et'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
