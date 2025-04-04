import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { Inter } from 'next/font/google';

import Container from '@/components/Container';
import Items from '@/components/Item';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import { Button } from '@/components/Button';

const inter = Inter({ subsets: ['latin'] });

type DNDType = {
  id: UniqueIdentifier;
  title: string;
  items: {
    id: UniqueIdentifier;
    title: string;
  }[];
};

export default function Home() {
  const [containers, setContainers] = useState<DNDType[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [currentContainerId, setCurrentContainerId] = useState<UniqueIdentifier>();
  const [containerName, setContainerName] = useState('');
  const [itemName, setItemName] = useState('');
  const [showAddContainerModal, setShowAddContainerModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Persist containers to localStorage
  useEffect(() => {
    const data = localStorage.getItem('dnd-containers');
    if (data) {
      setContainers(JSON.parse(data));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dnd-containers', JSON.stringify(containers));
  }, [containers]);

  const onAddContainer = () => {
    if (!containerName) return;
    const id = `container-${uuidv4()}`;
    setContainers([
      ...containers,
      {
        id,
        title: containerName,
        items: [],
      },
    ]);
    setContainerName('');
    setShowAddContainerModal(false);
  };

  const onAddItem = () => {
    if (!itemName) return;
    const id = `item-${uuidv4()}`;
    const container = containers.find((item) => item.id === currentContainerId);
    if (!container) return;
    container.items.push({ id, title: itemName });
    setContainers([...containers]);
    setItemName('');
    setShowAddItemModal(false);
  };

  const deleteContainer = (id: UniqueIdentifier) => {
    const filtered = containers.filter((c) => c.id !== id);
    setContainers(filtered);
  };

  const deleteItem = (containerId: UniqueIdentifier, itemId: UniqueIdentifier) => {
    const updated = containers.map((c) =>
      c.id === containerId
        ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
        : c
    );
    setContainers(updated);
  };

  const editContainer = (id: UniqueIdentifier, newTitle: string) => {
    const updated = containers.map((c) =>
      c.id === id ? { ...c, title: newTitle } : c
    );
    setContainers(updated);
  };

  const editItem = (containerId: UniqueIdentifier, itemId: UniqueIdentifier, newTitle: string) => {
    const updated = containers.map((c) =>
      c.id === containerId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === itemId ? { ...i, title: newTitle } : i
            ),
          }
        : c
    );
    setContainers(updated);
  };

  const findValueOfItems = (id: UniqueIdentifier | undefined, type: string) => {
    if (type === 'container') return containers.find((c) => c.id === id);
    if (type === 'item')
      return containers.find((c) => c.items.find((i) => i.id === id));
  };

  const findItemTitle = (id: UniqueIdentifier | undefined) => {
    const container = findValueOfItems(id, 'item');
    if (!container) return '';
    const item = container.items.find((item) => item.id === id);
    return item?.title ?? '';
  };

  const findContainerTitle = (id: UniqueIdentifier | undefined) => {
    const container = findValueOfItems(id, 'container');
    return container?.title ?? '';
  };

  const findContainerItems = (id: UniqueIdentifier | undefined) => {
    const container = findValueOfItems(id, 'container');
    return container?.items ?? [];
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeContainer = findValueOfItems(active.id, 'item');
    const overContainer = over.id.toString().includes('item')
      ? findValueOfItems(over.id, 'item')
      : findValueOfItems(over.id, 'container');

    if (!activeContainer || !overContainer) return;

    const activeContainerIndex = containers.findIndex(
      (c) => c.id === activeContainer.id
    );
    const overContainerIndex = containers.findIndex(
      (c) => c.id === overContainer.id
    );

    const activeItemIndex = activeContainer.items.findIndex(
      (item) => item.id === active.id
    );

    let newItems = [...containers];
    const [movedItem] = newItems[activeContainerIndex].items.splice(
      activeItemIndex,
      1
    );

    if (over.id.toString().includes('item')) {
      const overItemIndex = overContainer.items.findIndex(
        (item) => item.id === over.id
      );
      newItems[overContainerIndex].items.splice(overItemIndex, 0, movedItem);
    } else {
      newItems[overContainerIndex].items.push(movedItem);
    }

    setContainers(newItems);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIsContainer = active.id.toString().includes('container');
    const overIsContainer = over.id.toString().includes('container');

    if (activeIsContainer && overIsContainer) {
      const activeIndex = containers.findIndex((c) => c.id === active.id);
      const overIndex = containers.findIndex((c) => c.id === over.id);
      const newItems = arrayMove(containers, activeIndex, overIndex);
      setContainers(newItems);
    } else {
      handleDragMove(event);
    }

    setActiveId(null);
  };

  return (
    <div className="mx-auto max-w-7xl py-10">
      <Modal showModal={showAddContainerModal} setShowModal={setShowAddContainerModal}>
        <div className="flex flex-col w-full items-start gap-y-4">
          <h1 className="text-gray-800 text-3xl font-bold">Add Container</h1>
          <Input
            type="text"
            placeholder="Container Title"
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
          />
          <Button onClick={onAddContainer}>Add Task</Button>
        </div>
      </Modal>

      <Modal showModal={showAddItemModal} setShowModal={setShowAddItemModal}>
        <div className="flex flex-col w-full items-start gap-y-4">
          <h1 className="text-gray-800 text-3xl font-bold">Add Item</h1>
          <Input
            type="text"
            placeholder="Item Title"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Button onClick={onAddItem}>Add Item</Button>
        </div>
      </Modal>

      <div className="flex items-center justify-between gap-y-2">
        <h1 className="text-gray-800 text-3xl font-bold">BEYOND</h1>
        <Button onClick={() => setShowAddContainerModal(true)}>Add Container</Button>
      </div>

      <div className="mt-10">
        <div className="grid grid-cols-3 gap-6 mb-4">
          <div className="text-center font-bold text-lg bg-red-100 p-2 rounded">To Do</div>
          <div className="text-center font-bold text-lg bg-purple-100 p-2 rounded">In Progress</div>
          <div className="text-center font-bold text-lg bg-green-100 p-2 rounded">Done</div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={containers.map((i) => i.id)}>
            <div className="grid grid-cols-3 gap-6">
              {containers.map((container) => (
                <Container
                  key={container.id}
                  id={container.id}
                  title={container.title}
                  onAddItem={() => {
                    setShowAddItemModal(true);
                    setCurrentContainerId(container.id);
                  }}
                  onDelete={() => deleteContainer(container.id)}
                  onEdit={(newTitle: string) => editContainer(container.id, newTitle)}
                >
                  <SortableContext items={container.items.map((i) => i.id)}>
                    <div className="flex flex-col gap-y-4">
                      {container.items.map((item) => (
                        <Items
                          key={item.id}
                          id={item.id}
                          title={item.title}
                          onDelete={() => deleteItem(container.id, item.id)}
                          onEdit={(newTitle: string) =>
                            editItem(container.id, item.id, newTitle)
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </Container>
              ))}
            </div>
          </SortableContext>

          <DragOverlay adjustScale={false}>
            {activeId?.toString().includes('item') && (
              <Items id={activeId} title={findItemTitle(activeId)} />
            )}
            {activeId?.toString().includes('container') && (
              <Container id={activeId} title={findContainerTitle(activeId)}>
                {findContainerItems(activeId).map((i) => (
                  <Items key={i.id} id={i.id} title={i.title} />
                ))}
              </Container>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
